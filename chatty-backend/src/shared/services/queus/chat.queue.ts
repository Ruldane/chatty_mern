import { IMessageData } from './../../../features/chat/interfaces/chat.interface';
import { IChatJobData } from '@chat/interfaces/chat.interface';
import { BaseQueue } from './base.queue';
import { chatWorker } from '@worker/chat.worker';

class ChatQueue extends BaseQueue {
  constructor() {
    super('auth');
    this.processJob('addChatMessageToDB', 5, chatWorker.addChatMessageToDB);
    this.processJob('markMessageAsDeletedInDB', 5, chatWorker.markMessageAsDeleted);
  }

  public addChatJob(name: string, data: IChatJobData | IMessageData): void {
    this.addJob(name, data);
  }
}

export const chatQueue: ChatQueue = new ChatQueue();