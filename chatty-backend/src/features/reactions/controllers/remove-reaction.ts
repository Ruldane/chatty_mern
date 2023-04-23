import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { IReactionJob } from '@reaction/interfaces/reaction.interface';
import { ReactionCache } from '@service/redis/reaction.cache';
import { reactionQueue } from '@service/queus/reaction.queue';

const reactionCache: ReactionCache = new ReactionCache();

export class Remove {
  /**
   * Removes a user's reaction from a post and updates the database accordingly.
   *
   * @async
   * @param req - The HTTP request containing the post ID, the user's previous reaction,
   * and the list of reactions to the post.
   * @param res - The HTTP response to send after successfully removing the reaction.
   * @returns A Promise that resolves with void when the reaction is removed and the
   * response is sent.
   */
  public async reaction(req: Request, res: Response): Promise<void> {
    const { postId, previousReaction, postReactions } = req.params;
    await reactionCache.removePostReactionFromCache(postId, `${req.currentUser!.username}`, JSON.parse(postReactions));
    const databaseReactionData: IReactionJob = {
      postId,
      username: req.currentUser!.username,
      previousReaction
    };
    reactionQueue.addReactionJob('removeReactionFromDB', databaseReactionData);
    res.status(HTTP_STATUS.OK).json({ message: 'Reaction removed from post' });
  }
}
