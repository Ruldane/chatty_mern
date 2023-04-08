import Logger from 'bunyan';
import { config } from '@root/config';
import { BaseCache } from '@service/redis/base.cache';

const log: Logger = config.createLogger('RedisConnection');

class RedisConnection extends BaseCache {
  constructor() {
    super('RedisConnection');
  }
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      log.info(`Redis connection: ${await this.client.ping()}`);
    } catch (error) {
      log.error('RedisConnection error: ', error);
    }
  }
}

export const redisConnection: RedisConnection = new RedisConnection();
