import { IConversationDocument } from '@chat/interfaces/conversation.interface';
import { IMessageData } from '@chat/interfaces/chat.interface';
import { ConversationModel } from '@chat/models/conversation.schema';
import { MessageModel } from '@chat/models/chat.schema';
import { ObjectId } from 'mongodb';

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
}

export const chatService: ChatService = new ChatService();
