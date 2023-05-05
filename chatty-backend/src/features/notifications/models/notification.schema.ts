import { ServerError } from '@global/helpers/error-handler';
import { INotification, INotificationDocument } from '@notification/interfaces/notification.interface';
import { config } from '@root/config';
import Logger from 'bunyan';
import { notificationService } from '@service/db/notification.service';
import mongoose, { model, Model, Schema } from 'mongoose';

const notificationSchema: Schema = new Schema({
  userTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  read: { type: Boolean, default: false },
  message: { type: String, default: '' },
  notificationType: { type: String, default: '' },
  entityId: mongoose.Types.ObjectId,
  createdItemId: mongoose.Types.ObjectId,
  comment: { type: String, default: '' },
  reaction: { type: String, default: '' },
  post: { type: String, default: '' },
  imgId: { type: String, default: '' },
  imgVersion: { type: String, default: '' },
  gifUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now() }
});

const log: Logger = config.createLogger('commentsCache');

/**
 * Inserts a new notification into the database and returns the updated list of notifications for the given user.
 * @param body An object containing the details of the notification to be inserted.
 * @returns A list of all notifications for the given user, including the newly inserted notification.
 * @throws {ServerError} If there was an error getting the notifications.
 */
notificationSchema.methods.insertNotification = async function (body: INotification) {
  const { userTo, userFrom, message, notificationType, entityId, createdItemId, comment, reaction, post, imgId, imgVersion, gifUrl } = body;

  // Insert the new notification into the database.
  await NotificationModel.create({
    userTo,
    userFrom,
    message,
    notificationType,
    entityId,
    createdItemId,
    comment,
    reaction,
    post,
    imgId,
    imgVersion,
    gifUrl
  });

  try {
    // Get all notifications for the given user, including the newly inserted notification.
    const notifications: INotificationDocument[] = await notificationService.getNotifications(userTo);
    return notifications;
  } catch (error) {
    log.error(error);
    // Throw a ServerError if there was an error getting the notifications.
    throw new ServerError('Error getting notifications. Try again...');
  }
};

const NotificationModel: Model<INotification> = model<INotification>('Notification', notificationSchema, 'Notification');
export { NotificationModel };
