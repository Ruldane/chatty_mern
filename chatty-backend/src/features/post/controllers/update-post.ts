import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { PostCache } from '@service/redis/post.cache';
import { socketIOPostObject } from '@socket/post';
import { postQueue } from '@service/queus/post.queue';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { postSchema, postWithImageSchema } from '@post/schemes/post.schemes';
import { updatedPost, updatedPostWithImage } from '../../../mocks/post.mock';
import { IPostDocument } from '@post/interfaces/post.interface';
import { UploadApiResponse } from 'cloudinary';
import { uploads } from '@global/helpers/cloudinary-upload';
import { BadRequestError } from '@global/helpers/error-handler';

const postCache: PostCache = new PostCache();

export class Update {
  @joiValidation(postSchema)
  public async post(req: Request, res: Response): Promise<void> {
    // Get the post, background color, feelings, privacy, gif url, image version, image id, and profile picture from the request body.
    const { post, bgColor, feelings, privacy, gifUrl, imgVersion, imgId, profilePicture } = req.body;
    // Get the post id from the request parameters.
    const { postId } = req.params;
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      imgVersion,
      imgId,
      profilePicture
    } as IPostDocument;
    // Update the post in MongoDB
    const postUpdated = await postCache.updatePostInCache(postId, updatedPost);
    // Emit the delete event to the socket.io server
    socketIOPostObject.emit('update Post', postUpdated, 'posts');
    // Add the job to the queue
    postQueue.addPostJob('updatePostInDB', { key: postId, value: postUpdated });
    // Send a success response
    res.status(HTTP_STATUS.OK).json({ message: 'Post updated successfully' });
  }

  @joiValidation(postWithImageSchema)
  public async postWithImage(req: Request, res: Response): Promise<void> {
    // 1. Check if there is an image id and image version in the request body
    const { imgId, imgVersion } = req.body;
    if (imgId && imgVersion) {
      // 2. If there is an image id and image version in the request body, then update the post with the image
      Update.prototype.updatedPostWithImage(req);
    } else {
      // 3. If there is no image id and image version in the request body, then add an image to the post
      const result: UploadApiResponse = await Update.prototype.addImageToExistingPost(req);
      if (!result.public_id) {
        throw new BadRequestError(result.message);
      }
    }
    res.status(HTTP_STATUS.OK).json({ message: 'Post with image updated successfully' });
  }

  private async updatedPostWithImage(req: Request): Promise<void> {
    // 1. Get the data from the request body
    const { post, bgColor, feelings, privacy, gifUrl, imgVersion, imgId, profilePicture } = req.body;
    // 2. Get the data from the request params
    const { postId } = req.params;
    // 3. Create the object that will be used to update the post
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      imgVersion,
      imgId,
      profilePicture
    } as IPostDocument;
    // 4. Update the post in the cache
    const postUpdated = await postCache.updatePostInCache(postId, updatedPost);
    // 5. Emit the event to the socket.io
    socketIOPostObject.emit('update Post', postUpdated, 'posts');
    // 6. Add the job to the queue
    postQueue.addPostJob('updatePostInDB', { key: postId, value: updatedPost });
  }

  private async addImageToExistingPost(req: Request): Promise<UploadApiResponse> {
    const { post, bgColor, feelings, privacy, gifUrl, profilePicture, image } = req.body;
    // 1. get the data from the request body
    const { postId } = req.params;
    // 2. get the post ID from the request parameters
    const result: UploadApiResponse = (await uploads(image)) as UploadApiResponse;
    // 3. upload image to the cloud
    if (!result?.public_id) {
      return result;
    }
    // 4. check if the image was uploaded successfully
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      profilePicture,
      imgId: result.public_id,
      imgVersion: result.version.toString()
    } as IPostDocument;
    // 5. prepare the post object to be saved in the database
    const postUpdated = await postCache.updatePostInCache(postId, updatedPost);
    // 6. update the post in cache
    socketIOPostObject.emit('update Post', postUpdated, 'posts');
    // 7. send the new post to the client-side
    postQueue.addPostJob('updatePostInDB', { key: postId, value: postUpdated });
    // 8. add the post to the queue to save it in the database
    return result;
  }
}
