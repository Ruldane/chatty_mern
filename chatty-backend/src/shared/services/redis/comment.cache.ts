import { ICommentNameList } from './../../../features/comments/interfaces/comment.interface';
import { BaseCache } from '@service/redis/base.cache';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { find } from 'lodash';
import { ICommentDocument } from '@comment/interfaces/comment.interface';

const log: Logger = config.createLogger('commentsCache');

export class CommentCache extends BaseCache {
  constructor() {
    super('commentsCache');
  }
  /**
   * Saves a post comment to the cache.
   * @param postId - The ID of the post.
   * @param value - The comment to save.
   * @returns Promise<void>
   */
  public async savePostCommentToCache(postId: string, value: string): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Push the comment onto the comments list for the post.
      await this.client.LPUSH(`comments:${postId}`, value);

      // Increment the comments count for the post.
      const commentsCount: string[] = await this.client.HMGET(`posts:${postId}`, 'commentsCount');
      let count: number = Helpers.parseJson(commentsCount[0]) as number;
      count += 1;

      // Update the comments count in the post hash.
      await this.client.HSET(`posts:${postId}`, 'commentsCount', `${count}`);
    } catch (e) {
      log.error(e);
      // Throw a ServerError if there was an error saving the comment to the cache.
      throw new ServerError('Error saving post reaction to cache. Try again...');
    }
  }

  /**
   * Retrieves all comments for a given post ID from Redis cache.
   * @param postId - The ID of the post to retrieve comments for.
   * @returns - An array of comment documents.
   */
  public async getCommentsFromCache(postId: string): Promise<ICommentDocument[]> {
    try {
      // Ensure Redis client is connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Retrieve all comments from Redis list
      const reply: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);

      // Parse each comment from stringified JSON to a document
      const list: ICommentDocument[] = [];
      for (const item of reply) {
        list.push(JSON.parse(item));
      }

      // Return list of comment documents
      return list;
    } catch (e) {
      // Log any errors and throw a custom ServerError
      log.error(e);
      throw new ServerError('Error retrieving comments from cache. Try again...');
    }
  }
  /**
   * Retrieves a list of comment names from Redis cache for a given post ID.
   * @param postId - The ID of the post to retrieve comments for.
   * @returns - An array of ICommentNameList objects containing the count and names of comments.
   * @throws - Throws a ServerError if there was an error retrieving comments from cache.
   */
  public async getCommentsNamesFromCache(postId: string): Promise<ICommentNameList[]> {
    try {
      // Ensure Redis client is connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // Get number of comments and list of comment JSON strings from Redis
      const commentsCount: number = await this.client.LLEN(`comments:${postId}`);
      const comments: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);

      // Parse comment JSON strings and extract comment names
      const list: string[] = [];
      for (const item of comments) {
        const comment: ICommentDocument = Helpers.parseJson(item) as ICommentDocument;
        list.push(comment.username);
      }

      // Create response object with comment count and list of comment names
      const response: ICommentNameList = {
        count: commentsCount,
        names: list
      };

      return [response];
    } catch (e) {
      // Log any errors and throw a custom ServerError
      log.error(e);
      throw new ServerError('Error retrieving comments from cache. Try again...');
    }
  }

  /**
   * Retrieves a single comment from Redis cache.
   * @param postId - The ID of the post the comment belongs to.
   * @param commentId - The ID of the comment to retrieve.
   * @returns An array containing the single comment document retrieved from cache.
   * @throws Throws a custom ServerError if the function encounters any errors while retrieving the comment.
   */
  public async getSingleCommentFromCache(postId: string, commentId: string): Promise<ICommentDocument[]> {
    try {
      // Ensure Redis client is connected
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const comments: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);

      // Parse comment JSON strings and extract comment names
      const list: ICommentDocument[] = [];
      for (const item of comments) {
        list.push(Helpers.parseJson(item) as ICommentDocument);
      }

      // Find and return the comment with the matching ID
      const result: ICommentDocument = find(list, (listItem: ICommentDocument) => {
        return listItem._id === commentId;
      }) as ICommentDocument;
      return [result];
    } catch (e) {
      // Log any errors and throw a custom ServerError
      log.error(e);
      throw new ServerError('Error retrieving comments from cache. Try again...');
    }
  }
}
