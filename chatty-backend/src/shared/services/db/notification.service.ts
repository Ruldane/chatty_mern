import { INotificationDocument } from '@notification/interfaces/notification.interface';
import { NotificationModel } from '@notification/models/notification.schema';
import mongoose from 'mongoose';

class NotificationService {
  /**
   * Retrieves notifications for a given user.
   * @param userId - The ID of the user to retrieve notifications for.
   * @returns An array of notification documents.
   */
  public async getNotifications(userId: string): Promise<INotificationDocument[]> {
    // Query the NotificationModel to retrieve notifications for the given user ID.
    const notifications = await NotificationModel.aggregate([
      { $match: { userTo: new mongoose.Types.ObjectId(userId) } },
      // Lookup the user who sent the notification.
      { $lookup: { from: 'User', localField: 'userFrom', foreignField: '_id', as: 'userFrom' } },
      { $unwind: '$userFrom' },
      // Lookup the authentication information for the user who sent the notification.
      { $lookup: { from: 'Auth', localField: 'userFrom.authId', foreignField: '_id', as: 'authId' } },
      { $unwind: '$authId' },
      // Project the desired fields for the notification document.
      {
        $project: {
          id_: 1,
          message: 1,
          comment: 1,
          createAt: 1,
          createItemId: 1,
          entityId: 1,
          notificationType: 1,
          giftUrl: 1,
          imgId: 1,
          imgVersion: 1,
          post: 1,
          reaction: 1,
          read: 1,
          userTo: 1,
          userFrom: {
            profilePicture: '$userFrom.profilePicture',
            username: '$authId.username',
            avatarColor: '$authId.avatarColor',
            uId: '$authId.uId'
          }
        }
      }
    ]);
    return notifications;
  }

  /**
   * Updates a notification to mark it as read.
   * @param notificationId - The ID of the notification to update.
   * @returns A Promise that resolves with void.
   */
  public async updateNotification(notificationId: string): Promise<void> {
    // Mark a notification as read by updating the "read" field to true.
    await NotificationModel.updateOne({ _id: notificationId }, { read: true }).exec();
  }

  /**
   * Deletes a notification with the given ID.
   * @param notificationId - The ID of the notification to delete.
   * @returns A Promise that resolves with void.
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    await NotificationModel.deleteOne({ _id: notificationId }).exec();
  }
}

export const notificationService: NotificationService = new NotificationService();
