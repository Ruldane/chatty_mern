import { Helpers } from '@global/helpers/helpers';
import { IMessageData, IChatUsers, IChatList } from './../../../features/chat/interfaces/chat.interface';
import { BaseCache } from '@service/redis/base.cache';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { find, findIndex } from 'lodash';

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
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${key}`, 0, -1);
      const conversationChatList: IMessageData[] = [];
      for (const item of userChatList) {
        const chatItem: IChatList = Helpers.parseJson(item) as IChatList;
        const lastMessage: string = (await this.client.LINDEX(`messages:${chatItem.conversationId}`, -1)) as string;
        conversationChatList.push(Helpers.parseJson(lastMessage));
      }
      return conversationChatList;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getChatMessagesFromCache(senderId: string, receiverId: string): Promise<IMessageData[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const userChatList: string[] = await this.client.LRANGE(`chatList:${senderId}`, 0, -1);
      // const receiver: string = userChatList.filter((chatItem: string) => chatItem === receiverId)[0];
      const receiver: string = find(userChatList, (listItem: string) => listItem.includes(receiverId)) as string;
      const parsedReceiver: IChatList = Helpers.parseJson(receiver) as IChatList;
      if (parsedReceiver) {
        const userMessages: string[] = await this.client.LRANGE(`messages:${parsedReceiver.conversationId}`, 0, -1);
        const chatMessages: IMessageData[] = [];
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
}
