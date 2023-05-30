import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from 'http-status-codes';
import { addCommentSchema } from '@comment/schemes/comment';
import { ICommentDocument, ICommentJob } from '@comment/interfaces/comment.interface';
import { CommentCache } from '@service/redis/comment.cache';
import { commentQueue } from '@service/queus/comment.queue';

const commentCache: CommentCache = new CommentCache();

export class Add {
  @joiValidation(addCommentSchema)
  /**
   * Handles adding a comment to a post
   * @param req - The request object
   * @param res - The response object
   * @returns Promise<void>
   */
  public async comment(req: Request, res: Response): Promise<void> {
    // Destructure properties from request body
    const { userTo, postId, comment, profilePicture } = req.body;

    // Create a new ObjectId for the comment
    const commentObjectId: ObjectId = new ObjectId();

    // Create a new comment data object
    const commentData: ICommentDocument = {
      _id: commentObjectId,
      postId,
      username: `${req.currentUser!.username}`, // Username of the commenter
      avatarColor: `${req.currentUser!.avatarColor}`, // Avatar color of the commenter
      profilePicture,
      comment,
      createdAt: new Date() // Current date and time
    } as ICommentDocument;

    // Save comment data to cache
    await commentCache.savePostCommentToCache(postId, JSON.stringify(commentData));

    // Create database comment data object
    const databaseCommentData: ICommentJob = {
      postId,
      userTo,
      userFrom: req.currentUser!.userId, // User ID of the commenter
      username: req.currentUser!.username, // Username of the commenter
      comment: commentData // Comment data object
    };

    // Add comment job to queue
    commentQueue.addCommentJob('addCommentToDB', databaseCommentData);

    // Send response with success message
    res.status(HTTP_STATUS.OK).json({ message: 'Comment created successfully' });
  }
}
