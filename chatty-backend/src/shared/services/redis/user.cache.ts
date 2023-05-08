import { ISocialLinks, INotificationSettings } from '@user/interfaces/user.interface';
import { BaseCache } from '@service/redis/base.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';

const log: Logger = config.createLogger('userCache');
type UserItem = string | ISocialLinks | INotificationSettings;

export class UserCache extends BaseCache {
  constructor() {
    super('userCache');
  }

  /**
   * Saves a user to the cache.
   * @param key the key to store the user data under.
   * @param userUId the user ID to use for sorting.
   * @param createdUser the user document to store.
   */
  public async saveUserToCache(key: string, userUId: string, createdUser: IUserDocument): Promise<void> {
    const createdAt = new Date();
    const {
      _id,
      uId,
      username,
      email,
      avatarColor,
      blocked,
      blockedBy,
      postsCount,
      profilePicture,
      followersCount,
      followingCount,
      notifications,
      work,
      location,
      school,
      quote,
      bgImageId,
      bgImageVersion,
      social
    } = createdUser;

    // Constructing object containing data to be saved in Redis
    const dataToSave = {
      _id: `${_id}`,
      uId: `${uId}`,
      username: `${username}`,
      email: `${email}`,
      avatarColor: `${avatarColor}`,
      createdAt: `${createdAt}`, // Converting date object to string
      postsCount: `${postsCount}`,
      blocked: JSON.stringify(blocked), // Converting boolean to string
      blockedBy: JSON.stringify(blockedBy), // Converting boolean to string
      profilePicture: `${profilePicture}`,
      followersCount: `${followersCount}`,
      followingCount: `${followingCount}`,
      notifications: JSON.stringify(notifications), // Converting array to string
      social: JSON.stringify(social), // Converting object to string
      work: `${work}`,
      location: `${location}`,
      school: `${school}`,
      quote: `${quote}`,
      bgImageVersion: `${bgImageVersion}`,
      bgImageId: `${bgImageId}`
    };

    try {
      // check if the Redis client connection is open
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // add user to sorted set using userUId as score and key as value
      await this.client.ZADD('user', { score: parseInt(userUId, 10), value: `${key}` });

      // loop through dataToSave object and add each key/value pair to Redis hash
      for (const [itemKey, itemValue] of Object.entries(dataToSave)) {
        await this.client.HSET(`users:${key}`, `${itemKey}`, `${itemValue}`);
      }
    } catch (error) {
      // log error and throw server error if there is one
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Returns a user from the cache.
   * @param userId the user ID.
   * @returns the user from Redis.
   */
  public async getUserFromCache(userId: string): Promise<IUserDocument | null> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      const response: IUserDocument = (await this.client.HGETALL(`users:${userId}`)) as unknown as IUserDocument;
      response.createdAt = new Date(Helpers.parseJson(`${response.createdAt}`));
      response.postsCount = Helpers.parseJson(`${response.postsCount}`);
      response.blocked = Helpers.parseJson(`${response.blocked}`);
      response.blockedBy = Helpers.parseJson(`${response.blockedBy}`);
      response.notifications = Helpers.parseJson(`${response.notifications}`);
      response.social = Helpers.parseJson(`${response.social}`);
      response.followersCount = Helpers.parseJson(`${response.followersCount}`);
      response.followingCount = Helpers.parseJson(`${response.followingCount}`);
      response.bgImageId = Helpers.parseJson(`${response.bgImageId}`);
      response.bgImageVersion = Helpers.parseJson(`${response.bgImageVersion}`);
      response.profilePicture = Helpers.parseJson(`${response.profilePicture}`);

      return response;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Updates a single user item in the cache.
   * @param userId the user ID.
   * @param prop the property to update.
   * @param value the new value for the property.
   * @returns the updated user from Redis.
   */
  public async updateSingleUserItemInCache(userId: string, prop: string, value: UserItem): Promise<IUserDocument | null> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // Check if the value is already a string, otherwise stringify it
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      // Update the Redis hash with the new value for the specified property
      await this.client.HSET(`users:${userId}`, `${prop}`, stringValue);
      // Retrieve the updated user from cache and return it
      const response: IUserDocument = (await this.getUserFromCache(userId)) as IUserDocument;
      return response;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
