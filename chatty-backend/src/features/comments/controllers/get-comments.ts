import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { ICommentDocument } from '@comment/interfaces/comment.interface';
import { CommentCache } from '@service/redis/comment.cache';
import { commentService } from '@service/db/comment.service';
import { ICommentNameList } from '@comment/interfaces/comment.interface';
import mongoose from 'mongoose';

const commentCache: CommentCache = new CommentCache();

export class Get {
  /**
   * Get the comments for a post.
   *
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @return {Promise<void>}
   */
  public async comments(req: Request, res: Response): Promise<void> {
    // Extract the postId from the request parameters.
    const { postId } = req.params;

    // Get the comments from the cache if they exist, otherwise get them from the database.
    const cachedComments: ICommentDocument[] = await commentCache.getCommentsFromCache(postId);
    const comments: ICommentDocument[] = cachedComments.length
      ? cachedComments
      : await commentService.getPostComments({ postId: new mongoose.Types.ObjectId(postId) }, { createdAt: -1 });

    // Send the comments as a JSON response.
    res.status(HTTP_STATUS.OK).json({ message: 'Post comments', comments });
  }

  /**
   * Retrieves the list of comment names for a post from cache, or from the comment service if not present in cache.
   * @param req - The express request object.
   * @param res - The express response object.
   * @returns A Promise that resolves when the comment names have been retrieved and sent in the response.
   */
  public async commentsNamesFromCache(req: Request, res: Response): Promise<void> {
    // Extract the postId from the request parameters.
    const { postId } = req.params;

    // Attempt to retrieve the comment names from the cache.
    const cachedCommentsNames: ICommentNameList[] = await commentCache.getCommentsNamesFromCache(postId);

    // If the comment names were not present in the cache, retrieve them from the comment service.
    const commentsNames: ICommentNameList[] = cachedCommentsNames.length
      ? cachedCommentsNames
      : await commentService.getPostCommentNames({ postId: new mongoose.Types.ObjectId(postId) }, { createdAt: -1 });

    // Send the list of comment names in the response.
    res.status(HTTP_STATUS.OK).json({ message: 'Post comments names', comments: commentsNames });
  }

  /**
   * Retrieves a single comment from the cache or the database and sends it as a response.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @returns Promise that resolves once the comment has been sent as a response.
   */
  public async singleComment(req: Request, res: Response): Promise<void> {
    // Extract the postId and commentId from the request parameters.
    const { postId, commentId } = req.params;

    // Get the comment from the cache, if available.
    const cachedComment: ICommentDocument[] = await commentCache.getSingleCommentFromCache(postId, commentId);

    // If no comment was found in the cache, retrieve it from the database.
    const singleComment: ICommentDocument[] = cachedComment.length
      ? cachedComment
      : await commentService.getPostComments({ _id: new mongoose.Types.ObjectId(commentId) }, { createdAt: -1 });

    // Send the comment as a response.
    res.status(HTTP_STATUS.OK).json({ message: 'Single comment', comments: singleComment[0] });
  }
}
