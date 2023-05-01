import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { FollowerCache } from '@service/redis/follower.cache';
import { UserCache } from '@service/redis/user.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import { IFollowerData } from '@follower/interfaces/follower.interface';
import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import { socketIOFollowerObject } from '@socket/follower';
import { followerQueue } from '@service/queus/follower.queue';

const followerCache: FollowerCache = new FollowerCache();
const userCache: UserCache = new UserCache();

export class Add {
  public async follower(req: Request, res: Response): Promise<void> {
    const { followerId } = req.params;
    if (followerId === req.currentUser!.userId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'You cannot follow yourself' });
      return;
    }
    // update count in cache
    const followersCount: Promise<void> = followerCache.updateFollowerCountInCache(`${followerId}`, 'followersCount', 1);
    const followedCount: Promise<void> = followerCache.updateFollowerCountInCache(`${req.currentUser!.userId}`, 'followingCount', 1);
    await Promise.all([followersCount, followedCount]);
    const cachedFollower: Promise<IUserDocument> = userCache.getUserFromCache(`${followerId}`) as Promise<IUserDocument>;
    const cachedFollowed: Promise<IUserDocument> = userCache.getUserFromCache(`${req.currentUser!.userId}`) as Promise<IUserDocument>;
    const response: [IUserDocument, IUserDocument] = await Promise.all([cachedFollower, cachedFollowed]);

    const followerObjectId: ObjectId = new ObjectId();
    const addFollowedData: IFollowerData = Add.prototype.userData(response[0]);
    socketIOFollowerObject.emit('add follower', addFollowedData);
    console.log(req.currentUser);

    const addFollowerToCache: Promise<void> = followerCache.saveFollowerToCache(`followers:${req.currentUser!.userId}`, `${followerId}`);
    const addFollowedToCache: Promise<void> = followerCache.saveFollowerToCache(`following:${followerId}`, `${req.currentUser!.userId}`);
    await Promise.all([addFollowerToCache, addFollowedToCache]);
    followerQueue.addFollowerJob('addFollowerToDB', {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      username: `${req.currentUser!.username}`,
      followerDocumentId: followerObjectId
    });
    res.status(HTTP_STATUS.OK).json({ message: 'Following user now' });
  }

  private userData(user: IUserDocument): IFollowerData {
    return {
      _id: new mongoose.Types.ObjectId(user._id),
      username: user.username!,
      avatarColor: user.avatarColor!,
      postCount: user.postsCount,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      profilePicture: user.profilePicture,
      uId: user.uId!,
      userProfile: user
    };
  }
}
