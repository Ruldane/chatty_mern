import { BaseCache } from '@service/redis/base.cache';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { IFollowerData } from '@follower/interfaces/follower.interface';
import { UserCache } from '@service/redis/user.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import mongoose from 'mongoose';

const log: Logger = config.createLogger('reactionsCache');
const userCache: UserCache = new UserCache();

export class FollowerCache extends BaseCache {
  constructor() {
    super('followersCache');
  }

  /**
   * Saves a follower to cache.
   * @param key - The key to save the follower under.
   * @param value - The value of the follower to save.
   * @throws ServerError if there was an error while saving to cache.
   */
  public async saveFollowerToCache(key: string, value: string): Promise<void> {
    try {
      // Check if client is connected, and connect if not
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // Add follower to list of followers under the given key
      await this.client.LPUSH(key, value);
    } catch (error) {
      // Log error and throw ServerError
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Removes a follower from the cache.
   * @param key - The cache key to remove the follower from.
   * @param value - The follower value to remove from the cache.
   * @throws ServerError if there was an error removing the follower from the cache.
   * @returns Promise<void>
   */
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

  /**
   * Updates the follower count in the cache for a given user.
   * @param userId - The user ID.
   * @param prop - The property to update (e.g. 'followers').
   * @param value - The value to increment the property by.
   * @throws {ServerError} If an error occurs while updating the cache.
   */
  public async updateFollowerCountInCache(userId: string, prop: string, value: number): Promise<void> {
    try {
      // Check if client is connected, and connect if not
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Increment the specified property for the user in the cache
      await this.client.HINCRBY(`users:${userId}`, prop, value);
    } catch (error) {
      // Log the error and throw a server error
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Retrieves follower data from Redis cache
   * @param key - the cache key to retrieve follower data from
   * @returns a promise that resolves with an array of follower data objects
   */
  public async getFollowersFromCache(key: string): Promise<IFollowerData[]> {
    try {
      // Connect to Redis if not already connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // Retrieve follower data from Redis cache
      const response: string[] = await this.client.LRANGE(key, 0, -1);
      const list: IFollowerData[] = [];
      // For each follower data item, retrieve the corresponding user data from the user cache
      for (const item of response) {
        const user: IUserDocument = (await userCache.getUserFromCache(item)) as IUserDocument;
        // Create a follower data object using the retrieved user data
        const data: IFollowerData = {
          _id: new mongoose.Types.ObjectId(user._id),
          username: user.username!,
          avatarColor: user.avatarColor!,
          postCount: user.postsCount,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          profilePicture: user.profilePicture,
          uId: user.uId!,
          userProfile: user
        };
        // Add the follower data object to the list
        list.push(data);
      }
      // Return the list of follower data objects
      return list;
    } catch (error) {
      // Log and throw a server error if an error occurs
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
