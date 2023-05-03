import { IFollowerData, IFollowerDocument } from '@follower/interfaces/follower.interface';
import { FollowerModel } from '@follower/models/follower.schema';
import { IQueryComplete, IQueryDeleted } from '@post/interfaces/post.interface';
import { UserModel } from '@user/models/user.schema';
import { ObjectId, BulkWriteResult } from 'mongodb';
import mongoose, { Query } from 'mongoose';

class FollowerService {
  public async addFollowerToDB(userId: string, followeeId: string, username: string, followerDocumentId: ObjectId): Promise<void> {
    const followeeObjectId: ObjectId = new mongoose.Types.ObjectId(followeeId);
    const followerOjectId: ObjectId = new mongoose.Types.ObjectId(userId);

    const following = await FollowerModel.create({
      _id: followerDocumentId,
      followeeId: followeeObjectId,
      followerId: followerOjectId
    });
    const users: Promise<BulkWriteResult> = UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: userId },
          update: { $inc: { followingCount: 1 } }
        }
      },
      {
        updateOne: {
          filter: { _id: userId },
          update: { $inc: { followersCount: 1 } }
        }
      }
    ]);

    await Promise.all([users, UserModel.findOne({ _id: followeeId })]);
  }

  public async removeFollowerFromDB(followeeId: string, followerId: string): Promise<void> {
    const followeeObjectId: ObjectId = new mongoose.Types.ObjectId(followeeId);
    const followerOjectId: ObjectId = new mongoose.Types.ObjectId(followerId);

    const unfollow: Query<IQueryComplete & IQueryDeleted, IFollowerDocument> = FollowerModel.deleteOne({
      followeeId: followeeObjectId,
      followerId: followerOjectId
    });
    const users: Promise<BulkWriteResult> = UserModel.bulkWrite([
      {
        updateOne: {
          filter: { _id: followeeId },
          update: { $inc: { followingCount: -1 } }
        }
      },
      {
        updateOne: {
          filter: { _id: followeeId },
          update: { $inc: { followersCount: -1 } }
        }
      }
    ]);
    await Promise.all([unfollow, users]);
  }

  /**
   * Retrieves follower data for a given user.
   * @param userObjectId The ObjectId of the user to retrieve followee data for.
   * @returns An array of IFollowerData objects containing followee data.
   */
  public async getFolloweeData(userObjectId: ObjectId): Promise<IFollowerData[]> {
    const followee = await FollowerModel.aggregate([
      // Retrieve all documents where follower is userObjectId.
      { $match: { followerId: userObjectId } },
      // Perform a left outer join with the User collection to retrieve followee information.
      { $lookup: { from: 'User', localField: 'followeeId', foreignField: '_id', as: 'followeedId' } },
      // Unwind the followeedId array.
      { $unwind: '$followeedId' },
      // Perform a left outer join with the Auth collection to retrieve username and avatar color.
      { $lookup: { from: 'Auth', localField: 'followeeId.authId', foreignField: '_id', as: 'authId' } },
      // Unwind the authId array.
      { $unwind: '$authId' },
      // Add additional fields to the document.
      {
        $addFields: {
          _id: '$followeedId._id',
          username: '$authId.username',
          avatarColor: '$authId.avatarColor',
          uId: '$authId.uId',
          postCount: '$followeedId.postCount',
          followersCount: '$followeedId.followersCount',
          followingCount: '$followeedId.followingCount',
          profilePicture: '$followeedId.profilePicture',
          userProfile: '$followeedId'
        }
      },
      // Project only the necessary fields and exclude others.
      {
        $project: {
          authId: 0,
          followerId: 0,
          followeedId: 0,
          createdAt: 0,
          __v: 0
        }
      }
    ]);
    return followee;
  }

  /**
   * Retrieves follower data for a given user from the database.
   * @param userObjectId The user's ObjectId.
   * @returns An array of IFollowerData objects representing the user's followers.
   */
  public async getFollowerData(userObjectId: ObjectId): Promise<IFollowerData[]> {
    const follower: IFollowerData[] = await FollowerModel.aggregate([
      { $match: { followeeId: userObjectId } },
      { $lookup: { from: 'User', localField: 'followerId', foreignField: '_id', as: 'followerId' } },
      { $unwind: '$followerId' },
      { $lookup: { from: 'Auth', localField: 'followerId.authId', foreignField: '_id', as: 'authId' } },
      { $unwind: '$authId' },
      {
        $addFields: {
          _id: '$followerId._id',
          username: '$authId.username',
          avatarColor: '$authId.avatarColor',
          uId: '$authId.uId',
          postCount: '$followerId.postsCount',
          followersCount: '$followerId.followersCount',
          followingCount: '$followerId.followingCount',
          profilePicture: '$followerId.profilePicture',
          userProfile: '$followerId'
        }
      },
      {
        $project: {
          authId: 0,
          followerId: 0,
          followeeId: 0,
          createdAt: 0,
          __v: 0
        }
      }
    ]);
    return follower;
  }
}

export const followerService: FollowerService = new FollowerService();
