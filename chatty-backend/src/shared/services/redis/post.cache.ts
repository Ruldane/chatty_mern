import { BaseCache } from '@service/redis/base.cache';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { IPostDocument, ISavePostToCache } from '@post/interfaces/post.interface';
import { IReactions } from '@reaction/interfaces/reaction.interface';
import { RedisCommandRawReply } from '@redis/client/dist/lib/commands';

const log: Logger = config.createLogger('postCache');

export type PostCacheMultiType = string | number | Buffer | RedisCommandRawReply[] | IPostDocument | IPostDocument[];
export class PostCache extends BaseCache {
  constructor() {
    super('postCache');
  }

  /**
   * Saves a post to cache and updates the user's post count
   * @param {ISavePostToCache} data - An object containing data about the post to be saved
   */
  public async savePostToCache(data: ISavePostToCache): Promise<void> {
    const { key, currentUserId, uId, createdPost } = data;

    // Destructure the createdPost object
    const {
      _id,
      userId,
      username,
      email,

      avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount,
      imgVersion,
      imgId,
      reactions,
      createdAt
    } = createdPost;

    // Create a new object with stringified values
    const dataToSave = {
      _id: `${_id}`,
      userId: `${userId}`,
      username: `${username}`,
      email: `${email}`,
      avatarColor: `${avatarColor}`,
      profilePicture: `${profilePicture}`,
      post: `${post}`,
      bgColor: `${bgColor}`,
      feelings: `${feelings}`,
      privacy: `${privacy}`,
      gifUrl: `${gifUrl}`,
      commentsCount: `${commentsCount}`,
      reactions: JSON.stringify(reactions),
      imgVersion: `${imgVersion}`,
      imgId: `${imgId}`,
      createdAt: `${createdAt}`
    };

    try {
      // Check if client is connected, and connect if not
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Get the user's current post count
      const postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, 'postsCount');

      // Start a new Redis transaction
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();

      // Add the post to the 'post' sorted set
      await this.client.ZADD('post', { score: parseInt(uId, 10), value: `${key}` });

      // Save each item in the dataToSave object to Redis
      for (const [itemKey, itemValue] of Object.entries(dataToSave)) {
        multi.HSET(`posts:${key}`, `${itemKey}`, `${itemValue}`);
      }

      // Increment the user's post count
      const count: number = parseInt(postCount[0], 10) + 1;
      multi.HSET(`users:${currentUserId}`, 'postsCount', count);

      // Execute the Redis transaction
      multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Retrieves an array of post documents from a Redis cache based on a given key,
   * a start index, and an end index.
   * @param {string} key - The Redis key to retrieve the posts from.
   * @param {number} start - The start index of the range to retrieve.
   * @param {number} end - The end index of the range to retrieve.
   * @returns {Promise<IPostDocument[]>} - A promise that resolves to an array of post documents.
   */
  public async getPostsFromCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      // If the Redis client is not connected, connect to it.
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Retrieve an array of Redis keys based on the given range.
      const reply: string[] = await this.client.ZRANGE(key, start, end, { REV: true });

      // Create a Redis multi-object to retrieve the post documents for each key.
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }

      // Execute the Redis multi-object and retrieve the post documents.
      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        // Parse the JSON values of certain post document properties.
        post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = Helpers.parseJson(`${post.createdAt}`) as Date;
        postReplies.push(post);
      }

      // Return the array of post documents.
      return postReplies;
    } catch (error) {
      // Log the error and throw a server error.
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Returns the total number of posts in the cache.
   * @returns {Promise<number>} - The total number of posts in the cache.
   * @throws {ServerError} - If there is a server error.
   */
  public async getTotalPostsInCache(): Promise<number> {
    try {
      // Connect the client if it is not already open.
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Get the count of posts in the cache.
      const count: number = await this.client.ZCARD('post');

      // Return the count of posts.
      return count;
    } catch (error) {
      // Log the error and throw a ServerError.
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Returns an array of post documents with images from the cache.
   * @param key - The key to search for in the cache.
   * @param start - The starting index to retrieve from the cache.
   * @param end - The ending index to retrieve from the cache.
   * @returns An array of post documents with images.
   */
  public async getPostsWithImagesFromCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      // Connect to the Redis client if it is not already open
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      // Retrieve the specified range of values from the cache.
      const reply: string[] = await this.client.ZRANGE(key, start, end, { REV: true });
      // Create a new Redis multi command, which allows multiple commands to be executed in one operation.
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      // For each value retrieved from the cache, retrieve the corresponding post data from Redis.
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }
      // Execute the multi command and retrieve the results.
      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      // Filter out any posts that don't have images.
      const postWithImages: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        if ((post.imgId && post.imgVersion) || post.gifUrl) {
          // Parse certain properties from strings to their correct types.
          post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
          post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
          post.createdAt = Helpers.parseJson(`${post.createdAt}`) as Date;
          postWithImages.push(post);
        }
      }
      return postWithImages;
    } catch (error) {
      log.error(error);
      // If an error occurs, log it and throw a server error.
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Retrieves all posts for a user from the cache
   * @param key - the cache key to retrieve the user's posts from
   * @param uId - the ID of the user whose posts are being retrieved
   * @returns an array of post documents
   */
  public async getUserPostsFromCache(key: string, uId: number): Promise<IPostDocument[]> {
    try {
      // Connect to the Redis client if it is not already open
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Retrieve the IDs of all the user's posts from the cache
      const reply: string[] = await this.client.ZRANGE(key, uId, uId, { REV: true, BY: 'SCORE' });

      // Create a Redis multi command to retrieve all the post documents from the cache
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }

      // Execute the multi command and retrieve all the post documents from the cache
      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;

      // Parse the values of certain fields in each post document and push them into an array
      const postReplies: IPostDocument[] = [];
      for (const post of replies as IPostDocument[]) {
        post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = Helpers.parseJson(`${post.createdAt}`) as Date;
        postReplies.push(post);
      }

      // Return the array of post documents
      return postReplies;
    } catch (error) {
      // Log the error and throw a server error
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getTotalUserPostsInCache(uId: number): Promise<number> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const count: number = await this.client.ZCOUNT('post', uId, uId);
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Deletes a post from the cache and Redis, and updates the user's post count.
   * @param key The key of the post to delete.
   * @param currentUserId The ID of the user who posted the post.
   * @throws {ServerError} If there is a server error.
   */
  public async deletePostFromCache(key: string, currentUserId: string): Promise<void> {
    try {
      // Connect to Redis if not already connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Get the user's current post count
      const postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, 'postsCount');
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();

      // Remove the post from the sorted set
      multi.ZREM('post', `${key}`);

      // Remove the post and associated data from Redis
      multi.DEL(`posts:${key}`);
      multi.DEL(`comments:${key}`);
      multi.DEL(`reactions:${key}`);

      // Update the user's post count
      const count: number = parseInt(postCount[0], 10) - 1;
      multi.HSET(`users:${currentUserId}`, 'postsCount', count);

      // Execute the Redis commands as a transaction
      await multi.exec();
    } catch (error) {
      // Log any errors and throw a server error
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Updates a post in the cache with the provided key and updated post object.
   * @param key - The key used to identify the post in the cache.
   * @param updatedPost - The updated post object.
   * @returns The updated post object.
   */
  public async updatePostInCache(key: string, updatedPost: IPostDocument): Promise<IPostDocument> {
    // Destructure properties from updated post object.
    const { post, bgColor, feelings, privacy, gifUrl, imgVersion, imgId, profilePicture } = updatedPost;

    // Save data to update in object format.
    const dataToUpdate = {
      post: `${post}`, // Convert to string for Redis compatibility.
      bgColor: `${bgColor}`,
      feelings: `${feelings}`,
      privacy: `${privacy}`,
      gifUrl: `${gifUrl}`,
      imgVersion: `${imgVersion}`,
      imgId: `${imgId}`,
      profilePicture: `${profilePicture}`
    };

    try {
      // Connect to Redis if not already connected.
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Update each item in the cache with the new value.
      for (const [itemKey, itemValue] of Object.entries(dataToUpdate)) {
        this.client.HSET(`posts:${key}`, `${itemKey}`, `${itemValue}`);
      }

      // Get the updated post object from the cache.
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      multi.HGETALL(`posts:${key}`);
      const reply: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReply = reply as IPostDocument[];

      // Parse the post object's properties to their correct types.
      postReply[0].commentsCount = Helpers.parseJson(`${postReply[0].commentsCount}`) as number;
      postReply[0].reactions = Helpers.parseJson(`${postReply[0].reactions}`) as IReactions;
      postReply[0].createdAt = Helpers.parseJson(`${postReply[0].createdAt}`) as Date;

      // Return the updated post object.
      return postReply[0];
    } catch (error) {
      // Log and throw an error if something goes wrong.
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
