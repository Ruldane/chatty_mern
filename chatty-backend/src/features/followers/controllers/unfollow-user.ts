import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { FollowerCache } from '@service/redis/follower.cache';
import { followerQueue } from '@service/queus/follower.queue';

const followerCache: FollowerCache = new FollowerCache();

export class Remove {
  public async follower(req: Request, res: Response): Promise<void> {
    const { followeeId, followerId } = req.params;
    if (followeeId === req.currentUser!.userId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'You cannot unfollow yourself' });
      return;
    }
    // update count in cache
    const removeFollowerFromCache: Promise<void> = followerCache.removeFollowerFromCache(
      `followers:${req.currentUser!.userId}`,
      followeeId
    );
    const removeFolloweeFromCache: Promise<void> = followerCache.removeFollowerFromCache(`following:${followeeId}`, followerId);

    const followersCount: Promise<void> = followerCache.updateFollowerCountInCache(`${followeeId}`, 'followersCount', -1);
    const followedCount: Promise<void> = followerCache.updateFollowerCountInCache(`${followerId}`, 'followingCount', -1);

    await Promise.all([removeFollowerFromCache, removeFolloweeFromCache, followersCount, followedCount]);

    followerQueue.addFollowerJob('removeFollowerFromDB', {
      keyOne: `${followeeId}`,
      keyTwo: `${followerId}`
    });
    res.status(HTTP_STATUS.OK).json({ message: 'Follower removed' });
  }
}
