import { Helpers } from '@global/helpers/helpers';
import { IMessageData, IChatUsers, IChatList, IGetMessageFromCache } from './../../../features/chat/interfaces/chat.interface';
import { BaseCache } from '@service/redis/base.cache';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { find, findIndex, remove } from 'lodash';
import { IReaction } from '@reaction/interfaces/reaction.interface';

const log: Logger = config.createLogger('messageCache');

export class MessageCache extends BaseCache {
  constructor() {
    super('messageCache');
  }

  /**
   * Add chat list to cache
   * @param senderId - sender id
   * @param receiverId - receiver id
   * @param conversationId - conversation id
   * @returns Promise<void>
   */
  public async addChatListToCache(senderId: string, receiverId: string, conversationId: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      if (userChatList.length === 0) {
        await this.client.RPUSH(`chatList:${senderId}`, JSON.stringify({ receiverId, conversationId }));
      } else {
        const receiverIndex: number = findIndex(userChatList, (listItem: string) => listItem.includes(receiverId));
        if (receiverIndex < 0) {
          await this.client.RPUSH(`chatList:${senderId}`, JSON.stringify({ receiverId, conversationId }));
        }
      }
    } catch (error) {
      log.error(error);
      throw new ServerError('Server Error. Try again');
    }
  }

  /**
   * Add chat message to cache
   * @param conversationId - conversation id
   * @param value - message data
   * @returns Promise<void>
   */
  public async addChatMessageToCache(conversationId: string, value: IMessageData): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.RPUSH(`messages:${conversationId}`, JSON.stringify(value));
    } catch (error) {
      log.error(error);
      throw new ServerError('Server Error. Try again');
    }
  }

  /**
   * Add chat users to cache
   * @param value - chat user data
   * @returns Promise<IChatUsers[]>
   */
  public async addChatUsersToCache(value: IChatUsers): Promise<IChatUsers[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const users: IChatUsers[] = await this.getChatUserList();
      const userIndex: number = findIndex(users, (listItem: IChatUsers) => JSON.stringify(listItem) === JSON.stringify(value));
      let chatUsers: IChatUsers[] = [];
      if (userIndex < 0) {
        await this.client.RPUSH('chatUsers', JSON.stringify(value));
        chatUsers = await this.getChatUserList();
      } else {
        chatUsers = users;
      }
      return chatUsers;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server Error. Try again');
    }
  }

  /**
   * Remove chat users from cache
   * @param value - chat user data
   * @returns Promise<IChatUsers[]>
   */
  public async removeChatUsersToCache(value: IChatUsers): Promise<IChatUsers[]> {
    try {
      // check if client is connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // get all chat users
      const users: IChatUsers[] = await this.getChatUserList();
      // find index of chat user to remove
      const userIndex: number = findIndex(users, (listItem: IChatUsers) => JSON.stringify(listItem) === JSON.stringify(value));
      let chatUsers: IChatUsers[] = [];
      // if chat user exists, remove from cache
      if (userIndex > -1) {
        await this.client.LREM('chatUsers', userIndex, JSON.stringify(value));
        chatUsers = await this.getChatUserList();
      } else {
        chatUsers = users;
      }
      return chatUsers;
    } catch (error) {
      // log error and throw server error
      log.error(error);
      throw new ServerError('Server Error. Try again');
    }
  }

  /**
   * Get chat user list from cache
   * @returns Promise<IChatUsers[]>
   */
  private async getChatUserList(): Promise<IChatUsers[]> {
    // initialize an empty array to hold chat users
    const chatUsersList: IChatUsers[] = [];
    // get all chat users from cache
    const chatUsers = await this.client.LRANGE('chatUsers', 0, -1);
    // loop through chat users and parse each item to IChatUsers type
    for (const item of chatUsers) {
      const chatUser: IChatUsers = Helpers.parseJson(item) as IChatUsers;
      // add parsed chat user to chatUsersList array
      chatUsersList.push(chatUser);
    }
    // return chatUsersList array
    return chatUsersList;
  }

  /**
   * Get user conversation list from cache
   * @param key - user key
   * @returns Promise<IMessageData[]>
   */
  public async getUserConversationList(key: string): Promise<IMessageData[]> {
    try {
      // Connect to Redis client if not already open
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // Retrieve the user's chat list from Redis
      const userChatList: string[] = await this.client.LRANGE(`chatList:${key}`, 0, -1);
      // Iterate through each chat item and retrieve the last message in the conversation
      const conversationChatList: IMessageData[] = [];
      for (const item of userChatList) {
        // Parse the chat item as JSON
        const chatItem: IChatList = Helpers.parseJson(item) as IChatList;
        // Retrieve the last message in the conversation from Redis
        const lastMessage: string = (await this.client.LINDEX(`messages:${chatItem.conversationId}`, -1)) as string;
        // Parse the last message as JSON and add it to the conversation chat list array
        conversationChatList.push(Helpers.parseJson(lastMessage));
      }
      // Return the conversation chat list array
      return conversationChatList;
    } catch (error) {
      // Log any errors and throw a ServerError with a generic error message
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Retrieves chat messages from cache for a given sender and receiver.
   * @param senderId The ID of the sender.
   * @param receiverId The ID of the receiver.
   * @returns A Promise that resolves to an array of message data objects.
   */
  public async getChatMessagesFromCache(senderId: string, receiverId: string): Promise<IMessageData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // Retrieve the user's chat list from Redis.
      const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      // Find the chat item for the receiver in the user's chat list.
      const receiver: string = find(userChatList, (listItem: string) => listItem.includes(receiverId)) as string;
      // Parse the chat item for the receiver.
      const parsedReceiver: IChatList = Helpers.parseJson(receiver) as IChatList;
      if (parsedReceiver) {
        // Retrieve the user's messages for the conversation from Redis.
        const userMessages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
        const chatMessages: IMessageData[] = [];
        // Parse the user's messages into message data objects.
        for (const item of userMessages) {
          const chatItem = Helpers.parseJson(item) as IMessageData;
          chatMessages.push(chatItem);
        }
        return chatMessages;
      } else {
        return [];
      }
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Marks a message as deleted for the specified user(s).
   * @param senderId The ID of the sender of the message.
   * @param receiverId The ID of the intended receiver of the message.
   * @param messageId The ID of the message.
   * @param type The type of deletion to perform ('deleteForMe' or 'deleteForEveryone').
   * @returns The updated message data.
   */
  public async markMessageAsDeleted(senderId: string, receiverId: string, messageId: string, type: string): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Get the message data and its index in the conversation.
      const { index, message, receiver } = await this.getMessage(senderId, receiverId, messageId);
      const chatItem = Helpers.parseJson(message) as IMessageData;

      // Update the message data to reflect the deletion.
      if (type === 'deleteForMe') {
        chatItem.deleteForMe = true;
      } else {
        chatItem.deleteForMe = true;
        chatItem.deleteForEveryone = true;
      }

      // Update the message in the conversation.
      await this.client.LSET(`messages:${receiver.conversationId}`, index, JSON.stringify(chatItem));

      // Get the updated message and return its data.
      const lastMessage: string = (await this.client.LINDEX(`messages:${receiver.conversationId}`, index)) as string;
      return Helpers.parseJson(lastMessage) as IMessageData;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Updates chat messages between two users
   * @param senderId - the ID of the user initiating the chat
   * @param receiverId - the ID of the user receiving the chat
   * @returns the last message sent in the conversation as an IMessageData object
   */
  public async updateChatMessages(senderId: string, receiverId: string): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Get the list of chats for the sender and find the chat with the receiver
      const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      const receiver: string = find(userChatList, (listItem: string) => listItem.includes(receiverId)) as string;
      const parsedReceiver: IChatList = Helpers.parseJson(receiver) as IChatList;

      // Get the list of messages for the conversation with the receiver and filter for unread messages
      const messages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
      const unReadMessages: string[] = messages.filter((message: string) => !Helpers.parseJson(message).isRead);

      // Loop through the unread messages and mark them as read in the database
      for (const item of unReadMessages) {
        const chatItem = Helpers.parseJson(item) as IMessageData;
        const index: number = messages.findIndex((listItem: string) => listItem.includes(`${chatItem._id}`));
        chatItem.isRead = true;
        await this.client.LSET(`messages:${chatItem.conversationId}`, index, JSON.stringify(chatItem));
      }

      // Get the last message sent in the conversation and return it
      const lastMessage: string = (await this.client.LINDEX(`messages:${parsedReceiver.conversationId}`, -1)) as string;
      return Helpers.parseJson(lastMessage) as IMessageData;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async updateMessageReaction(
    conversationId: string,
    messageId: string,
    reaction: string,
    senderName: string,
    type: 'add' | 'remove'
  ): Promise<IMessageData> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // fetch all messages from the conversation
      const messages: string[] = await this.client.LRANGE(`messages:${conversationId}`, 0, -1);
      // Find the chat list item that corresponds to the given receiver ID.
      const messageIndex: number = findIndex(messages, (listItem: string) => listItem.includes(messageId)) as number;
      const message: string = (await this.client.LINDEX(`messages:${conversationId}`, messageIndex)) as string;
      // Parse the chat list item as JSON and extract the conversation ID.
      const parsedMessage: IMessageData = Helpers.parseJson(message) as IMessageData;
      const reactions: IReaction[] = [];
      if (parsedMessage) {
        //  remove(parsedMessage.reaction, (reactionItem: IReaction) => reactionItem.senderName === senderName);
        parsedMessage.reaction = parsedMessage.reaction.filter((reactionItem: IReaction) => reactionItem.senderName !== senderName);
        if (type === 'add') {
          reactions.push({
            senderName,
            type: reaction
          });
          parsedMessage.reaction = [...parsedMessage.reaction, ...reactions];
          await this.client.LSET(`messages:${conversationId}`, messageIndex, JSON.stringify(parsedMessage));
        } else {
          await this.client.LSET(`messages:${conversationId}`, messageIndex, JSON.stringify(parsedMessage));
        }
      }
      // Get the last message sent in the conversation and return it
      const updatedMessage: string = (await this.client.LINDEX(`messages:${conversationId}`, messageIndex)) as string;
      return Helpers.parseJson(updatedMessage) as IMessageData;
    } catch (error) {
      console.error(error);
      throw new ServerError('Server Error. Try again');
    }
  }

  /**
   * Retrieves a message from cache.
   * @param senderId The ID of the message sender.
   * @param receiverId The ID of the message receiver.
   * @param messageId The ID of the message.
   * @returns An object containing the index of the message, the message itself, and the receiver's chat list.
   */
  private async getMessage(senderId: string, receiverId: string, messageId: string): Promise<IGetMessageFromCache> {
    // Retrieve the user's chat list from Redis.
    const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
    // Find the chat list item that corresponds to the given receiver ID.
    const receiver: string = find(userChatList, (listItem: string) => listItem.includes(receiverId)) as string;
    // Parse the chat list item as JSON and extract the conversation ID.
    const parsedReceiver: IChatList = Helpers.parseJson(receiver) as IChatList;
    // Retrieve all messages in the conversation from Redis.
    const messages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
    // Find the message that corresponds to the given message ID.
    const message: string = find(messages, (item: string) => item.includes(messageId)) as string;
    // Find the index of the message within the conversation.
    const index: number = findIndex(messages, (item: string) => item.includes(messageId)) as number;
    return { index, message, receiver: parsedReceiver };
  }
}
