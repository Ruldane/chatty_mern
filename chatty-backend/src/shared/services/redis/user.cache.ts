import { ISocialLinks, INotificationSettings } from '@user/interfaces/user.interface';
import { BaseCache } from '@service/redis/base.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { RedisCommandRawReply } from '@redis/client/dist/lib/commands';

const log: Logger = config.createLogger('userCache');
type UserItem = string | ISocialLinks | INotificationSettings;
type UserCacheMultiType = string | number | Buffer | RedisCommandRawReply[] | IUserDocument | IUserDocument[];

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

  public async getUsersFromCache(start: number, end: number, excludedUserKey: string): Promise<IUserDocument[]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.ZRANGE('user', start, end, { REV: true });
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const key of response) {
        if (key !== excludedUserKey) {
          multi.HGETALL(`users:${key}`);
        }
      }
      const replies: UserCacheMultiType = (await multi.exec()) as UserCacheMultiType;
      const userReplies: IUserDocument[] = [];
      for (const reply of replies as IUserDocument[]) {
        reply.createdAt = new Date(Helpers.parseJson(`${reply.createdAt}`));
        reply.postsCount = Helpers.parseJson(`${reply.postsCount}`);
        reply.blocked = Helpers.parseJson(`${reply.blocked}`);
        reply.blockedBy = Helpers.parseJson(`${reply.blockedBy}`);
        reply.notifications = Helpers.parseJson(`${reply.notifications}`);
        reply.social = Helpers.parseJson(`${reply.social}`);
        reply.followersCount = Helpers.parseJson(`${reply.followersCount}`);
        reply.followingCount = Helpers.parseJson(`${reply.followingCount}`);
        reply.bgImageId = Helpers.parseJson(`${reply.bgImageId}`);
        reply.bgImageVersion = Helpers.parseJson(`${reply.bgImageVersion}`);
        reply.profilePicture = Helpers.parseJson(`${reply.profilePicture}`);

        userReplies.push(reply);
      }
      return userReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Retrieves a list of random users from the cache, excluding the user with the given username and the current user's followers.
   * @param userId The ID of the current user.
   * @param excludedUsername The username of the user to exclude from the list.
   * @returns A Promise of an array of IUserDocument objects representing the random users.
   */
  public async getRandomUsersFromCache(userId: string, excludedUsername: string): Promise<IUserDocument[]> {
    try {
      // Connect to the Redis cache if not already connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Initialize an empty array to store the resulting user documents
      const replies: IUserDocument[] = [];

      // Retrieve the current user's followers and all users from the cache
      const followers: string[] = await this.client.LRANGE(`followers${userId}`, 0, -1);
      const users: string[] = await this.client.ZRANGE('user', 0, -1);

      // Shuffle the list of users and select the first 10
      const randomUsers: string[] = Helpers.shuffle(users).slice(0, 10);

      // Iterate over the selected users and retrieve their user documents from the cache
      for (const key of randomUsers) {
        // Exclude the user if they are a follower of the current user
        const followerIndex = followers.indexOf(key);
        if (followerIndex < 0) {
          // Retrieve the user document from the cache and add it to the replies array
          const userHash: IUserDocument = (await this.client.HGETALL(`users:${key}`)) as unknown as IUserDocument;
          replies.push(userHash);
        }
      }

      // Remove the user with the excluded username from the replies array
      const excludeUsernameIndex = replies.findIndex((user) => user.username === excludedUsername);
      replies.splice(excludeUsernameIndex, 1);

      // Parse the user document fields and return the resulting array of user documents
      for (const reply of replies) {
        reply.createdAt = new Date(Helpers.parseJson(`${reply.createdAt}`));
        reply.postsCount = Helpers.parseJson(`${reply.postsCount}`);
        reply.blocked = Helpers.parseJson(`${reply.blocked}`);
        reply.blockedBy = Helpers.parseJson(`${reply.blockedBy}`);
        reply.notifications = Helpers.parseJson(`${reply.notifications}`);
        reply.social = Helpers.parseJson(`${reply.social}`);
        reply.followersCount = Helpers.parseJson(`${reply.followersCount}`);
        reply.followingCount = Helpers.parseJson(`${reply.followingCount}`);
        reply.bgImageId = Helpers.parseJson(`${reply.bgImageId}`);
        reply.bgImageVersion = Helpers.parseJson(`${reply.bgImageVersion}`);
        reply.profilePicture = Helpers.parseJson(`${reply.profilePicture}`);
      }
      return replies;
    } catch (error) {
      // Log the error and throw a server error
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

  public async getTotalUserInCache(): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.ZCARD('user');
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
