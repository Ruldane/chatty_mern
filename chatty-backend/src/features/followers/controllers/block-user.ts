import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { FollowerCache } from '@service/redis/follower.cache';
import { blockedUserQueue } from '@service/queus/blocked.queue';

const followerCache: FollowerCache = new FollowerCache();

export class AddUser {
  /**
   * Async function that blocks a user.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<void>} - A promise that resolves when the function is done.
   */
  public async block(req: Request, res: Response): Promise<void> {
    // Extract the followerId from the request params.
    const { followerId } = req.params;

    // Update the blocked user in the database.
    AddUser.prototype.updateBlockedUser(followerId, req.currentUser!.userId, 'block');

    // Add the blocked user to the queue.
    blockedUserQueue.addBlockedUser('addBlockedUserToDB', {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      type: 'block'
    });

    // Send a success response.
    res.status(HTTP_STATUS.OK).json({ message: 'User blocked' });
  }
  /**
   * Unblocks a user with the given followerId for the current user.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when the user is unblocked.
   */
  public async unblock(req: Request, res: Response): Promise<void> {
    // Extract the followerId from the request parameters.
    const { followerId } = req.params;

    // Update the blocked user in the database.
    AddUser.prototype.updateBlockedUser(followerId, req.currentUser!.userId, 'unblock');

    // Add a job to the blockedUserQueue to remove the blocked user from the database.
    blockedUserQueue.addBlockedUser('removeBlockedUserFromDB', {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      type: 'unblock'
    });

    // Respond with a success message.
    res.status(HTTP_STATUS.OK).json({ message: 'User unblocked' });
  }

  /**
   * Updates the blocked status of a user for another user in the cache.
   * @param followerId The ID of the user performing the action.
   * @param userId The ID of the user whose blocked status is being updated.
   * @param type The type of update, either 'block' or 'unblock'.
   * @returns A Promise that resolves when the update is complete.
   */
  private async updateBlockedUser(followerId: string, userId: string, type: 'block' | 'unblock'): Promise<void> {
    const blocked: Promise<void> = followerCache.updateBlockedUserPropInCache(`${userId}`, 'blocked', `${followerId}`, type);
    const blockedBy: Promise<void> = followerCache.updateBlockedUserPropInCache(`${followerId}`, 'blockedBy', `${userId}`, type);
    await Promise.all([blocked, blockedBy]);
  }
}
