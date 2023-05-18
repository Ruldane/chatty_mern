import { IConversationDocument } from '@chat/interfaces/conversation.interface';
import { IMessageData } from '@chat/interfaces/chat.interface';
import { ConversationModel } from '@chat/models/conversation.schema';
import { MessageModel } from '@chat/models/chat.schema';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

class ChatService {
  /**
   * Adds a message to the database.
   * @param data - The IMessageData object containing the message data to be added to the database.
   * @returns A Promise that resolves when the message has been added to the database.
   */
  public async addMessageToDB(data: IMessageData): Promise<void> {
    const conversation: IConversationDocument[] = await ConversationModel.find({
      _id: data?.conversationId
    }).exec();
    if (!conversation.length) {
      await ConversationModel.create({
        _id: data?.conversationId,
        senderId: data?.senderId,
        receiverId: data?.receiverId
      });
    }
    await MessageModel.create({
      _id: data._id,
      conversationId: data.conversationId,
      receiverId: data.receiverId,
      receiverUsername: data.receiverUsername,
      receiverAvatarColor: data.receiverAvatarColor,
      receiverProfilePicture: data.receiverProfilePicture,
      senderUsername: data.senderUsername,
      senderId: data.senderId,
      senderAvatarColor: data.senderAvatarColor,
      senderProfilePicture: data.senderProfilePicture,
      body: data.body,
      isRead: data.isRead,
      gifUrl: data.gifUrl,
      selectedImage: data.selectedImage,
      reaction: data.reaction,
      createdAt: data.createdAt
    });
  }

  /**
   * Retrieves a list of user conversations with the latest message in each conversation.
   * @param userId - The ObjectId of the user whose conversations are to be fetched.
   * @returns A Promise that resolves to an array of IMessageData objects representing the user's conversations.
   */
  public async getUserConversationsList(userId: ObjectId): Promise<IMessageData[]> {
    // Aggregate messages from the MessageModel
    const messages: IMessageData[] = await MessageModel.aggregate([
      // Match messages where either senderId or receiverId is equal to userId
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      // Group messages by conversationId and get the last message in each group
      { $group: { _id: '$conversationId', result: { $last: '$$ROOT' } } },
      // Project the required fields from the result
      {
        $project: {
          _id: '$result._id',
          conversationId: '$result.conversationId',
          receiverId: '$result.receiverId',
          receiverUsername: '$result.receiverUsername',
          receiverAvatarColor: '$result.receiverAvatarColor',
          receiverProfilePicture: '$result.receiverProfilePicture',
          senderUsername: '$result.senderUsername',
          senderId: '$result.senderId',
          senderAvatarColor: '$result.senderAvatarColor',
          senderProfilePicture: '$result.senderProfilePicture',
          body: '$result.body',
          isRead: '$result.isRead',
          gifUrl: '$result.gifUrl',
          selectedImage: '$result.selectedImage',
          reaction: '$result.reaction',
          createdAt: '$result.createdAt'
        }
      },
      // Sort the messages by createdAt in ascending order
      { $sort: { createdAt: 1 } }
    ]);
    return messages;
  }

  /**
   * Retrieves messages between two users.
   * @param senderId The ID of the user who sent the messages.
   * @param receiverId The ID of the user who received the messages.
   * @param sort An object specifying the sorting order of the messages.
   * @returns An array of messages between the two users.
   */
  public async getMessages(senderId: ObjectId, receiverId: ObjectId, sort: Record<string, 1 | -1>): Promise<IMessageData[]> {
    // Construct the query to retrieve messages between the two users
    const query = {
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    };

    // Retrieve messages matching the query and sort them according to the given sort order
    const messages: IMessageData[] = await MessageModel.aggregate([{ $match: query }, { $sort: sort }]);

    // Return the retrieved messages
    return messages;
  }

  /**
   * Marks a message as deleted based on the given message ID and type.
   *
   * @param {ObjectId} messageId - The ID of the message to mark as deleted.
   * @param {string} type - The type of deletion to perform ('deleteForMe' or 'deleteForEveryone').
   * @return {Promise<void>} A Promise that resolves when the message has been marked as deleted.
   */
  public async markMessageAsDeleted(messageId: ObjectId, type: string): Promise<void> {
    if (type === 'deleteForMe') {
      await MessageModel.updateOne({ _id: messageId }, { $set: { deleteForMe: true } }).exec();
    } else {
      await MessageModel.updateOne({ _id: messageId }, { $set: { deleteForMe: true, deleteForEveryone: true } }).exec();
    }
  }

  /**
   * Updates a message's reaction based on the provided message ID, sender name, reaction, and type.
   *
   * @param {ObjectId} messageId - The ID of the message to update.
   * @param {string} senderName - The name of the sender of the reaction.
   * @param {string} reaction - The reaction to add or remove from the message.
   * @param {'add' | 'remove'} type - The type of operation to perform on the reaction.
   * @return {Promise<void>} A Promise that resolves when the update operation is complete.
   */
  public async updateMessageReaction(messageId: ObjectId, senderName: string, reaction: string, type: 'add' | 'remove'): Promise<void> {
    if (type === 'add') {
      await MessageModel.updateOne({ _id: messageId }, { $push: { reaction: { senderName, type: reaction } } }).exec();
    } else {
      await MessageModel.updateOne({ _id: messageId }, { $pull: { reaction: { senderName } } }).exec();
    }
  }

  /**
   * Marks all unread messages between two users as read.
   * @param receiverId The ID of the message receiver.
   * @param senderId The ID of the message sender.
   * @returns Promise that resolves when all messages have been marked as read.
   */
  public async markMessagesAsRead(receiverId: ObjectId, senderId: ObjectId): Promise<void> {
    // Build query to find all messages between sender and receiver that are unread.
    const query = {
      $or: [
        { senderId, receiverId, isRead: false },
        { senderId: receiverId, receiverId: senderId, isRead: false }
      ]
    };
    // Update all matching messages to be marked as read.
    await MessageModel.updateMany(query, { $set: { isRead: true } }).exec();
  }
}

export const chatService: ChatService = new ChatService();
