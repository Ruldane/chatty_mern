import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { IReactionDocument, IReactionJob } from '@reaction/interfaces/reaction.interface';
import { ReactionCache } from '@service/redis/reaction.cache';
import { reactionQueue } from '@service/queus/reaction.queue';
import { reactionService } from '@service/db/reaction.service';
import mongoose from 'mongoose';

const reactionCache: ReactionCache = new ReactionCache();

export class Get {
  /**
   * Retrieves reactions for a post and sends them in the response.
   * @param req - Express Request object containing the post ID in the params
   * @param res - Express Response object to send the reactions in the response
   */
  public async reactions(req: Request, res: Response): Promise<void> {
    // Extract the post ID from the request parameters
    const { postId } = req.params;

    // Try to get the reactions from cache first
    const cacheReactions: [IReactionDocument[], number] = await reactionCache.getReactionsFromCache(postId);

    // If the reactions are not in cache, fetch them from the database
    const reactions: [IReactionDocument[], number] = cacheReactions[0].length
      ? cacheReactions
      : await reactionService.getPostReactions({ postId: new mongoose.Types.ObjectId(postId) }, { createdAt: -1 });

    // Send the reactions in the response
    res.status(HTTP_STATUS.OK).json({ message: 'Post reactions', reactions: reactions[0], count: reactions[1] });
  }

  /**
   * Retrieves a single post reaction by username from cache or database
   * @param req - The Express Request object containing postId and username parameters
   * @param res - The Express Response object that will return the result
   * @returns Promise<void>
   */
  public async getSingleReactionsByUsername(req: Request, res: Response): Promise<void> {
    const { postId, username } = req.params;

    // Check cache for reaction by username
    const cacheReaction: [IReactionDocument, number] | [] = await reactionCache.getSingleReactionByUsernameFromCache(postId, username);

    // If cache miss, get reaction by username from database
    const reactions: [IReactionDocument, number] | [] = cacheReaction.length
      ? cacheReaction
      : await reactionService.getSinglePostReactionByUsername(postId, username);

    // Return response with reactions and count
    res.status(HTTP_STATUS.OK).json({
      message: 'Single post reaction by username',
      reactions: reactions.length ? reactions[0] : {},
      count: reactions.length ? reactions[1] : 0
    });
  }

  /**
   * Get all reactions by username.
   *
   * @param req The HTTP request object.
   * @param res The HTTP response object.
   */
  public async reactionsByUsername(req: Request, res: Response): Promise<void> {
    // Extract the username from the request parameters.
    const { username } = req.params;

    // Get all reactions for the given username from the database.
    const reactions: IReactionDocument[] = await reactionService.getReactionsByUsername(username);

    // Send the reactions back to the client as a JSON response.
    res.status(HTTP_STATUS.OK).json({
      message: 'All reactions by username',
      reactions
    });
  }
}
