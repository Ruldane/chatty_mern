import { IMessageData, IMessageNotification } from './../interfaces/chat.interface';
import { Request, Response } from 'express';
import { UserCache } from '@service/redis/user.cache';
import HTTP_STATUS from 'http-status-codes';
import { IUserDocument } from '@user/interfaces/user.interface';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { addChatSchema } from '@chat/schemes/chat';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { UploadApiOptions } from 'cloudinary';
import { uploads } from '@global/helpers/cloudinary-upload';
import { BadRequestError } from '@global/helpers/error-handler';
import { config } from '@root/config';
import { socketIOChatObject } from '@socket/chat';
import { INotificationTemplate } from '@notification/interfaces/notification.interface';
import { emailQueue } from '@service/queus/email.queue';
import { notificationTemplate } from '@service/emails/templates/notifications/notification.template';
import { MessageCache } from '@service/redis/message.cache';

const userCache: UserCache = new UserCache();
const messageCache: MessageCache = new MessageCache();

export class Add {
  @joiValidation(addChatSchema)
  public async message(req: Request, res: Response): Promise<void> {
    const {
      conversationId,
      senderId,
      receiverId,
      receiverUsername,
      receiverAvatarColor,
      receiverProfilePicture,
      body,
      gifUrl,
      isRead,
      selectedImage
    } = req.body;
    let fileUrl = '';
    const messageObjectId: ObjectId = new ObjectId();
    const conversationOjectId: ObjectId = !conversationId ? new ObjectId() : new mongoose.Types.ObjectId(conversationId);
    const sender: IUserDocument = (await userCache.getUserFromCache(`${req.currentUser!.userId}`)) as IUserDocument;

    if (selectedImage.length) {
      // Uploads the image file to cloudinary and retrieves the upload result
      const result: UploadApiOptions = (await uploads(req.body.image, `${req.currentUser!.userId}`, true, true)) as UploadApiOptions;

      // Throws error and returns BAD REQUEST status code if upload is unsuccessful
      if (!result?.public_id) {
        throw new BadRequestError(result.message);
      }
      fileUrl = `https://res.cloudinary.com/${config.CLOUD_NAME}/image/upload/v${result.version}/${result.public_id}`;
    }
    const messageData: IMessageData = {
      _id: `${messageObjectId}`,
      conversationId: new mongoose.Types.ObjectId(conversationId),
      receiverId,
      receiverUsername,
      receiverAvatarColor,
      receiverProfilePicture,
      senderUsername: `${req.currentUser!.username}`,
      senderId: `${req.currentUser!.userId}`,
      senderAvatarColor: `${req.currentUser!.avatarColor}`,
      senderProfilePicture: `${sender!.profilePicture}`,
      body,
      isRead,
      gifUrl,
      selectedImage: fileUrl,
      reaction: [],
      createdAt: new Date(),
      deleteForEveryone: false,
      deleteForMe: false
    };
    Add.prototype.emitSocketIoEvent(messageData);
    if (!isRead) {
      await Add.prototype.messageNotification({
        currentUser: req.currentUser!,
        message: body,
        receiverName: receiverUsername,
        receiverId,
        messageData
      });
    }
    // message for sender
    await messageCache.addChatListToCache(`${req.currentUser!.userId}`, `${receiverId}`, `${conversationId}`);
    // message for receiver
    await messageCache.addChatListToCache(`${receiverId}`, `${req.currentUser!.userId}`, `${conversationId}`);
    res.status(HTTP_STATUS.OK).json({ message: 'Message sent successfully', conversationId: conversationOjectId });
  }

  private emitSocketIoEvent(data: IMessageData): void {
    socketIOChatObject.emit('add message', data);
    socketIOChatObject.emit('chat list', data);
  }

  /**
   * Sends a notification email to the receiver of a message if they have notifications enabled
   * @param {Object} IMessageNotification - An object containing the current user, message, receiver name, and receiver ID
   * @returns {Promise<void>}
   */
  private async messageNotification({ currentUser, message, receiverName, receiverId }: IMessageNotification): Promise<void> {
    // Get the cached user from Redis
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(`${receiverId}`)) as IUserDocument;

    // If the user has message notifications enabled, send an email to notify them of the new message
    if (cachedUser.notifications.messages) {
      // Construct the email template
      const templateParams: INotificationTemplate = {
        username: receiverName,
        message,
        header: `Message notification from ${currentUser.username}`
      };
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);

      // Add the email job to the queue
      emailQueue.addEmailJob('directMessageEmail', {
        receiverEmail: currentUser.email,
        subject: `You received a new message from ${currentUser.username}`,
        template
      });
    }
  }
}
