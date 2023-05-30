import { IUserDocument } from '@user/interfaces/user.interface';
import { IFollowerData, IFollowerDocument } from '@follower/interfaces/follower.interface';
import { FollowerModel } from '@follower/models/follower.schema';
import { IQueryComplete, IQueryDeleted } from '@post/interfaces/post.interface';
import { UserModel } from '@user/models/user.schema';
import { ObjectId, BulkWriteResult } from 'mongodb';
import mongoose, { Query } from 'mongoose';
import { emailQueue } from '@service/queus/email.queue';
import { notificationTemplate } from '@service/emails/templates/notifications/notification.template';
import { INotificationDocument, INotificationTemplate } from '@notification/interfaces/notification.interface';
import { NotificationModel } from '@notification/models/notification.schema';
import { socketIONotificationObject } from '@socket/notification';

class FollowerService {
  /**
   * Adds a follower to the database.
   * @param userId The ObjectId of the user following.
   * @param followeeId The ObjectId of the user being followed.
   * @param username The username of the user following.
   * @param followerDocumentId The ObjectId of the follower document.
   */
  public async addFollowerToDB(userId: string, followeeId: string, username: string, followerDocumentId: ObjectId): Promise<void> {
    // Convert followeeId and userId to ObjectIds.
    const followeeObjectId: ObjectId = new mongoose.Types.ObjectId(followeeId);
    const followerOjectId: ObjectId = new mongoose.Types.ObjectId(userId);

    // Create a new follower document.
    const following = await FollowerModel.create({
      _id: followerDocumentId,
      followeeId: followeeObjectId,
      followerId: followerOjectId
    });

    // Increment the followingCount and followersCount of the user.
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

    // Wait for both the following and users promises to resolve.
    const response: [BulkWriteResult, IUserDocument | null] = await Promise.all([
      users,
      UserModel.findOne({ _id: followeeId }).populate('authId')
    ]);

    // If the followee has notifications enabled, create a new notification document and send a notification email.
    if (response[1]?.notifications.follows && userId !== followeeId) {
      // Create a new notification document.
      const notificationModel: INotificationDocument = new NotificationModel() as INotificationDocument;
      const notifications = await notificationModel.insertNotification({
        userFrom: userId,
        userTo: followeeId,
        message: `${username} is now following you.`,
        notificationType: 'follows',
        entityId: new mongoose.Types.ObjectId(userId),
        createdItemId: new mongoose.Types.ObjectId(following._id),
        comment: '',
        reaction: '',
        post: '',
        imgId: '',
        imgVersion: '',
        gifUrl: '',
        createdAt: new Date()
      });

      // Send the notification to the followee's client with socketio.
      socketIONotificationObject.emit('insert notification', notifications, { userTo: followeeId });

      // Send the notification to the followee's email queue.
      const templateParams: INotificationTemplate = {
        username: response[1].username!,
        message: `${username} is now following you.`,
        header: 'Follower notification'
      };
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);
      emailQueue.addEmailJob('followersEmail', {
        receiverEmail: response[1].email!,
        subject: `${username} is following you.`,
        template
      });
    }
  }

  /**
   * Removes a follower from the database.
   * @param followeeId The ObjectId of the user being followed.
   * @param followerId The ObjectId of the user following.
   */
  public async removeFollowerFromDB(followeeId: string, followerId: string): Promise<void> {
    // Convert followeeId and followerId to ObjectIds.
    const followeeObjectId: ObjectId = new mongoose.Types.ObjectId(followeeId);
    const followerOjectId: ObjectId = new mongoose.Types.ObjectId(followerId);

    // Delete the follower document.
    const unfollow: Query<IQueryComplete & IQueryDeleted, IFollowerDocument> = FollowerModel.deleteOne({
      followeeId: followeeObjectId,
      followerId: followerOjectId
    });

    // Decrement the followingCount and followersCount of the followee.
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

    // Wait for both the unfollow and users promises to resolve.
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

  public async getFolloweeIds(userId: string): Promise<string[]> {
    const followee = await FollowerModel.aggregate([
      { $match: { followerId: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          followeeId: 1,
          _id: 0,
          __v: 0
        }
      }
    ]);
    return followee.map((f) => f.followeeId.toString());
  }
}

export const followerService: FollowerService = new FollowerService();
