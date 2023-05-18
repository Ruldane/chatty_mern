import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { MessageCache } from '@service/redis/message.cache';
import { IMessageData } from '@chat/interfaces/chat.interface';
import { socketIOChatObject } from '@socket/chat';
import { chatQueue } from '@service/queus/chat.queue';
import mongoose from 'mongoose';

const messageCache: MessageCache = new MessageCache();

export class Message {
  /**
   * Asynchronously updates a message's reaction and emits a socket event.
   *
   * @param {Request} req - the HTTP request object
   * @param {Response} res - the HTTP response object
   * @return {Promise<void>} - a Promise that resolves with no value
   */
  public async reaction(req: Request, res: Response): Promise<void> {
    const { conversationId, messageId, reaction, type } = req.body;
    const updatedMessage: IMessageData = await messageCache.updateMessageReaction(
      `${conversationId}`,
      `${messageId}`,
      `${reaction}`,
      `${req.currentUser!.username}`,
      type
    );
    if (updatedMessage) {
      socketIOChatObject.emit('message reaction', updatedMessage);
      chatQueue.addChatJob('updateMessageReaction', {
        messageId: new mongoose.Types.ObjectId(messageId),
        senderName: req.currentUser!.username,
        reaction,
        type
      });
      res.status(HTTP_STATUS.OK).json({ message: 'Messages reaction added' });
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Message not found' });
    }
  }
}