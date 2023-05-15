import { IMessageData } from './../interfaces/chat.interface';
import { Request, Response } from 'express';
import { UserCache } from '@service/redis/user.cache';
import HTTP_STATUS from 'http-status-codes';
import { MessageCache } from '@service/redis/message.cache';
import { chatService } from '@service/db/chat.service';
import mongoose from 'mongoose';

const userCache: UserCache = new UserCache();
const messageCache: MessageCache = new MessageCache();

export class Get {
  public async conversationList(req: Request, res: Response): Promise<void> {
    let list: IMessageData[] = [];
    const cacheList: IMessageData[] = await messageCache.getUserConversationList(`${req.currentUser!.userId}`);
    if (cacheList.length) {
      list = cacheList;
    } else {
      list = await chatService.getUserConversationsList(new mongoose.Types.ObjectId(req.params.userId));
    }
    res.status(HTTP_STATUS.OK).json({ message: 'User conversation list fetched.', list });
  }
}
