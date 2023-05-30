import { BaseCache } from '@service/redis/base.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { IReactionDocument, IReactions } from '@reaction/interfaces/reaction.interface';
import { find } from 'lodash';

const log: Logger = config.createLogger('reactionsCache');

export class ReactionCache extends BaseCache {
  constructor() {
    super('userCache');
  }
  /**
  Saves a post reaction to cache.
  @param {string} key - The cache key to save the reaction under.
  @param {IReactionDocument} reaction - The reaction to save.
  @param {IReactions} postReactions - The reactions associated with the post.
  @param {string} type - The type of reaction being saved.
  @param {string} previousReaction - The previous reaction, if it exists.
  @returns {Promise}
  @throws {ServerError} - If an error occurs while saving to cache. 
  */
  public async savePostReactionToCache(
    key: string,
    reaction: IReactionDocument,
    postReactions: IReactions,
    type: string,
    previousReaction: string
  ): Promise<void> {
    try {
      // If the Redis client is not connected, connect it
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // If a previous reaction exists, remove it from the cache
      if (previousReaction) {
        this.removePostReactionFromCache(key, reaction.username, postReactions);
      }

      // If a type is specified, save the reaction and reactions associated with the post to cache
      if (type) {
        await this.client.LPUSH(`reactions:${key}`, JSON.stringify(reaction));
        await this.client.HSET(`posts:${key}`, 'reactions', JSON.stringify(postReactions));
      }
    } catch (e) {
      // If an error occurs, log the error and throw a ServerError with an error message
      log.error(e);
      throw new ServerError('Error saving post reaction to cache. Try again...');
    }
  }

  /**
   * Remove a post reaction from the cache.
   *
   * @param key - The cache key to remove the reaction from.
   * @param username - The username of the user who reacted.
   * @param postReactions - The updated post reactions object.
   * @returns A Promise that resolves when the reaction is removed from the cache.
   * @throws {ServerError} When there's an error saving the reaction to the cache.
   */
  public async removePostReactionFromCache(key: string, username: string, postReactions: IReactions): Promise<void> {
    try {
      // Check if the Redis client connection is open
      if (!this.client.isOpen) {
        // If it's not, connect to the Redis server
        await this.client.connect();
      }
      // Get all reactions for the post from the Redis cache
      const response: string[] = await this.client.LRANGE(`reactions:${key}`, 0, -1);
      // Create a Redis transaction that will remove the user's previous reaction from the cache
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      // Get the user's previous reaction from the Redis cache
      const userPreviousReaction: IReactionDocument = this.getPreviousReaction(response, username) as IReactionDocument;
      // Remove the user's previous reaction from the Redis cache
      multi.LREM(`reactions:${key}`, 1, JSON.stringify(userPreviousReaction));
      // Execute the Redis transaction
      await multi.exec();
      // Update the post reactions object in the Redis cache
      await this.client.HSET(`posts:${key}`, 'reactions', JSON.stringify(postReactions));
    } catch (error) {
      // Log the error to the console
      log.error(error);
      // Throw a new ServerError with a user-friendly error message
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Returns the previous reaction of a given `username` from a list of `response` strings.
   * @param response - An array of strings to be parsed as `IReactionDocument` objects.
   * @param username - The username whose previous reaction is to be found.
   * @returns An `IReactionDocument` object representing the previous reaction of the user. Returns `undefined` if no previous reaction is found.
   */
  private getPreviousReaction(response: string[], username: string): IReactionDocument | undefined {
    // Create an empty list to hold `IReactionDocument` objects.
    const list: IReactionDocument[] = [];

    // Loop through each `response` string and parse it as an `IReactionDocument` object before adding it to the list.
    for (const item of response) {
      list.push(Helpers.parseJson(item) as IReactionDocument);
    }

    // Find the first `IReactionDocument` object in the list that has a `username` property matching the given `username`.
    return find(list, (listItem: IReactionDocument) => {
      return listItem.username === username;
    });
  }

  /**
   * Retrieves reactions from the Redis cache for a given post ID.
   *
   * @param postId The ID of the post to retrieve reactions for.
   * @returns A Promise that resolves to an array containing the reaction documents
   * and the total number of reactions.
   * @throws Throws a ServerError if there is an error retrieving reactions from the cache.
   */
  public async getReactionsFromCache(postId: string): Promise<[IReactionDocument[], number]> {
    try {
      // Check if the Redis client connection is open
      if (!this.client.isOpen) {
        // If it's not, connect to the Redis server
        await this.client.connect();
      }

      // Get the number of reactions for the given post from the Redis cache
      const reactionCount: number = await this.client.LLEN(`reactions:${postId}`);

      // Get the reaction documents for the given post from the Redis cache
      const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1);

      // Parse the JSON response into an array of reaction documents
      const list: IReactionDocument[] = [];
      for (const item of response) {
        list.push(Helpers.parseJson(item) as IReactionDocument);
      }

      // Return the reaction documents and the total number of reactions
      return response.length > 0 ? [list, reactionCount] : [[], 0];
    } catch (error) {
      // Log the error to the console
      log.error(error);

      // Throw a new ServerError with a user-friendly error message
      throw new ServerError('Server error. Try again.');
    }
  }

  /**
   * Retrieves a single reaction from the Redis cache by post ID and username.
   *
   * @param postId - ID of the post to retrieve reactions from.
   * @param username - Username of the reaction to retrieve.
   * @returns An array containing the matching reaction document and the number 1, or an empty array if no match was found.
   * @throws ServerError if an error occurs while fetching data from the Redis cache.
   */
  public async getSingleReactionByUsernameFromCache(postId: string, username: string): Promise<[IReactionDocument, number] | []> {
    try {
      // Check if the Redis client connection is open
      if (!this.client.isOpen) {
        // If it's not, connect to the Redis server
        await this.client.connect();
      }

      // Retrieve all the reactions for the given post ID from Redis cache
      const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1);

      // Parse the response strings into an array of IReactionDocuments
      const list: IReactionDocument[] = [];
      for (const item of response) {
        list.push(Helpers.parseJson(item) as IReactionDocument);
      }

      // Find the first reaction in the list that matches the given post ID and username
      const result: IReactionDocument = find(list, (listItem: IReactionDocument) => {
        return listItem?.postId === postId && listItem?.username === username;
      }) as IReactionDocument;

      // If a matching reaction was found, return it along with the number 1
      // If no matching reaction was found, return an empty array
      return response.length > 0 ? [result, 1] : [];
    } catch (error) {
      // Log the error to the console
      log.error(error);

      // Throw a new ServerError with a user-friendly error message
      throw new ServerError('Server error. Try again.');
    }
  }
}
