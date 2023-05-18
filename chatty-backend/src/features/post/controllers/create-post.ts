import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { postSchema, postWithImageSchema } from '@post/schemes/post.schemes';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from 'http-status-codes';
import { IPostDocument } from '@post/interfaces/post.interface';
import { PostCache } from '@service/redis/post.cache';
import { socketIOPostObject } from '@socket/post';
import { postQueue } from '@service/queus/post.queue';
import { UploadApiResponse } from 'cloudinary';
import { BadRequestError } from '@global/helpers/error-handler';
import { uploads } from '@global/helpers/cloudinary-upload';
import { imageQueue } from '@service/queus/image.queue';

const postCache: PostCache = new PostCache();

export class Create {
  @joiValidation(postSchema)
  /**
  Creates a new post and sends it to the server through the socketIO connection.
  Also saves the post to the cache and adds it to the post queue to be added to the database.
  @param {Request} req - The request object containing the post data and the current user information.
  @param {Response} res - The response object that will be sent back to the client.
  @returns {Promise} - A promise that resolves once the post has been created and saved. 
  */
  public async post(req: Request, res: Response): Promise<void> {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings } = req.body;
    const postObjectId: ObjectId = new ObjectId();
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: '',
      imgId: '',
      feelings,
      createdAt: new Date(),
      reactions: {
        like: 0,
        love: 0,
        happy: 0,
        sad: 0,
        wow: 0,
        angry: 0
      }
    } as IPostDocument;
    // Send the newly created post to the server via socketIO connection
    socketIOPostObject.emit('add post', createdPost);

    // Save the newly created post to cache
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    });

    // Add the newly created post to the post queue to eventually save to database
    postQueue.addPostJob('addPostToDB', { key: req.currentUser!.userId, value: createdPost });

    // Respond back to the client with HTTP status code 201 and newly created post
    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created successfully', post: createdPost });
  }

  @joiValidation(postWithImageSchema)
  /**
   * Sends a POST request to the server to create a new post with an image. The function extracts
   * the necessary data from the request body, uploads the image to the server using the 'uploads'
   * function, constructs a new post document, emits the newly created post to the server via the
   * 'socketIOPostObject' connection, save the newly created post to the cache, adds the newly created
   * post to the post queue to eventually save to the database, adds the image to the image queue to
   * eventually save to the database, and responds with HTTP status code 201 and the newly created post.
   *
   * @param {Request} req - The express request object.
   * @param {Response} res - The express response object.
   * @return {Promise<void>} Returns a Promise that resolves with undefined when the async operations
   * are complete.
   */
  public async postWithImage(req: Request, res: Response): Promise<void> {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, image } = req.body;
    const result: UploadApiResponse = (await uploads(image)) as UploadApiResponse;

    // If image was not properly uploaded, throw BadRequestError with message
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }

    const postObjectId: ObjectId = new ObjectId();

    // Construct the new post document from request parameters and uploaded image result
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: result.version.toString(),
      imgId: result.public_id,
      feelings,
      createdAt: new Date(),
      reactions: {
        like: 0,
        love: 0,
        happy: 0,
        sad: 0,
        wow: 0,
        angry: 0
      }
    } as IPostDocument;

    // Send the newly created post to the server via socketIO connection
    socketIOPostObject.emit('add post', createdPost);

    // Save the newly created post to cache
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    });

    // Add the newly created post to the post queue to eventually save to database
    postQueue.addPostJob('addPostToDB', { key: req.currentUser!.userId, value: createdPost });

    // Add the image to the image queue to eventually save to database
    imageQueue.addImageJob('addImageToDB', {
      key: `${req.currentUser!.userId}`,
      imgId: result.public_id,
      imgVersion: result.version.toString()
    });

    // Respond back to the client with HTTP status code 201 and newly created post
    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created with image successfully', post: createdPost });
  }
}
