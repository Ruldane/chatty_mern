import { BaseCache } from '@service/redis/base.cache';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { IPostDocument, ISavePostToCache } from '@post/interfaces/post.interface';
import { IReactions } from '@reaction/interfaces/reaction.interface';
import { RedisCommandRawReply } from '@redis/client/dist/lib/commands';

const log: Logger = config.createLogger('reactionsCache');

export class FollowerCache extends BaseCache {
  constructor() {
    super('followersCache');
  }

  public async saveFollowerToCache(key: string, value: string): Promise<void> {
    try {
      // Check if client is connected, and connect if not
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.LPUSH(key, value);
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async removeFollowerFromCache(key: string, value: string): Promise<void> {
    try {
      // Check if client is connected, and connect if not
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.LREM(key, 1, value);
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async updateFollowerCountInCache(userId: string, prop: string, value: number): Promise<void> {
    try {
      // Check if client is connected, and connect if not
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.HINCRBY(`users:${userId}`, prop, value);
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
