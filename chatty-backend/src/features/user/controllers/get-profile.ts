import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { FollowerCache } from '@service/redis/follower.cache';
import { PostCache } from '@service/redis/post.cache';
import { UserCache } from '@service/redis/user.cache';
import { IAllUsers, IUserDocument } from '@user/interfaces/user.interface';
import { userService } from '@service/db/user.service';
import { IFollowerData } from '@follower/interfaces/follower.interface';
import mongoose from 'mongoose';
import { followerService } from '@service/db/follower.service';
import { Helpers } from '@global/helpers/helpers';
import { IPostDocument } from '@post/interfaces/post.interface';
import { postService } from '@service/db/post.service';

interface IUserAll {
  newSkip: number;
  limit: number;
  skip: number;
  userId: string;
}

const postCache: PostCache = new PostCache();
const userCache: UserCache = new UserCache();
const followerCache: FollowerCache = new FollowerCache();

const PAGE_SIZE = 12;

export class Get {
  /**
   * Retrieves all users and their posts for the currently authenticated user either from a cache or from the database.
   * @param req The HTTP request object containing the current user's ID and the page number to retrieve.
   * @param res The HTTP response object to send the user and post data to.
   * @returns A Promise of void.
   */
  public async all(req: Request, res: Response): Promise<void> {
    // Extract the page number parameter from the request
    const { page } = req.params;

    // Calculate the number of posts to skip and the number of users to retrieve based on the page number
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    const limit: number = PAGE_SIZE * parseInt(page);

    // Calculate the starting value for the Redis cache
    const newSkip: number = skip === 0 ? skip : skip + 1;

    // Retrieve all users and their posts from the cache or the database
    const allUsers = await Get.prototype.allUsers({
      newSkip,
      limit,
      skip,
      userId: `${req.currentUser!.userId}`
    });

    // Retrieve the followers of the currently authenticated user from the cache or the database
    const followers: IFollowerData[] = await Get.prototype.followers(`${req.currentUser!.userId}`);

    // Send the user and post data to the response object
    res.status(HTTP_STATUS.OK).json({ message: 'Get users', users: allUsers.users, totalUsers: allUsers.totalUsers, followers });
  }

  /**
   * Retrieves the user profile for the currently authenticated user either from a cache or from the database.
   * @param req The HTTP request object containing the current user's ID.
   * @param res The HTTP response object to send the user profile data to.
   * @returns A Promise of void.
   */
  public async profile(req: Request, res: Response): Promise<void> {
    // Check if there is a cached user with the current user's ID
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(`${req.currentUser!.userId}`)) as IUserDocument;

    // If there is a cached user, use it. Otherwise, retrieve the user from the database.
    const existingUser: IUserDocument = cachedUser ? cachedUser : await userService.getUserById(`${req.currentUser!.userId}`);

    // Send the user profile data to the response object
    res.status(HTTP_STATUS.OK).json({ message: 'Get user profile', user: existingUser });
  }
  /**
   * Retrieves a list of random user suggestions for the current user.
   * @param req The Express Request object.
   * @param res The Express Response object.
   * @returns A Promise that resolves when the response is sent.
   */
  public async randomUserSuggestion(req: Request, res: Response): Promise<void> {
    // Initialize an empty array to store the resulting user documents
    let randomUsers: IUserDocument[] = [];

    // Check if the user suggestions are cached for the current user
    const cachedUser: IUserDocument[] = await userCache.getRandomUsersFromCache(`${req.currentUser!.userId}`, req.currentUser!.username);
    if (cachedUser.length) {
      // If the user suggestions are cached, use the cached data
      randomUsers = [...cachedUser];
    } else {
      // If the user suggestions are not cached, retrieve them from the database
      const users: IUserDocument[] = await userService.getRandomUsers(req.currentUser!.userId);
      randomUsers = [...users];
    }

    // Send the resulting array of user documents as a JSON response
    res.status(HTTP_STATUS.OK).json({ message: 'User suggestions', users: randomUsers });
  }

  /**
   * Retrieves the user profile for a given user ID either from a cache or from the database.
   * @param req The HTTP request object containing the user ID parameter.
   * @param res The HTTP response object to send the user profile data to.
   * @returns A Promise of void.
   */
  public async profileByUserId(req: Request, res: Response): Promise<void> {
    // Extract the user ID parameter from the request
    const { userId } = req.params;

    // Check if there is a cached user with the given ID
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(`${userId}`)) as IUserDocument;

    // If there is a cached user, use it. Otherwise, retrieve the user from the database.
    const existingUser: IUserDocument = cachedUser ? cachedUser : await userService.getUserById(`${userId}`);

    // Send the user profile data to the response object
    res.status(HTTP_STATUS.OK).json({ message: 'Get user profile by id', user: existingUser });
  }

  /**
   * Retrieves the user profile and posts for a given user ID either from a cache or from the database.
   * @param req The HTTP request object containing the user ID, username, and uId parameters.
   * @param res The HTTP response object to send the user profile and posts data to.
   * @returns A Promise of void.
   */
  public async profileAndPosts(req: Request, res: Response): Promise<void> {
    // Extract the user ID, username, and uId parameters from the request
    const { userId, username, uId } = req.params;

    // Capitalize the first letter of the username parameter
    const userName: string = Helpers.firstLetterUpperCase(username) as string;

    // Check if there is a cached user with the given ID and cached posts for the given uId
    const cachedUser: IUserDocument = (await userCache.getUserFromCache(`${userId}`)) as IUserDocument;
    const cachedUserPosts: IPostDocument[] = await postCache.getUserPostsFromCache('post', parseInt(uId, 10));

    // If there is a cached user, use it. Otherwise, retrieve the user from the database.
    const existingUser: IUserDocument = cachedUser ? cachedUser : await userService.getUserById(`${userId}`);

    // If there are cached posts, use them. Otherwise, retrieve the posts from the database.
    const userPosts: IPostDocument[] = cachedUserPosts.length
      ? cachedUserPosts
      : await postService.getPosts({ username: userName }, 0, 100, { createdAt: -1 });

    // Send the user profile and posts data to the response object
    res.status(HTTP_STATUS.OK).json({ message: 'Get user profile and posts', user: existingUser, posts: userPosts });
  }

  private async allUsers({ newSkip, limit, skip, userId }: IUserAll): Promise<IAllUsers> {
    let users;
    let type = '';
    const cachedUsers: IUserDocument[] = (await userCache.getUsersFromCache(newSkip, limit, userId)) as IUserDocument[];
    if (cachedUsers.length) {
      type = 'redis';
      users = cachedUsers;
    } else {
      type = 'mongodb';
      users = await userService.getAllUsers(userId, newSkip, limit);
    }
    const totalUsers: number = await Get.prototype.usersCount(type);
    return { users, totalUsers };
  }

  /**
   * Retrieves the total number of users either from a cache or from the database.
   * @param type The type of storage to retrieve the user count from ('redis' for cache, 'db' for database).
   * @returns A Promise of the total number of users as a number.
   */
  private async usersCount(type: string): Promise<number> {
    // Determine which storage to retrieve the user count from based on the given type
    const totalUsers: number = type === 'redis' ? await userCache.getTotalUserInCache() : await userService.getTotalUserInDB();

    // Return the total number of users
    return totalUsers;
  }

  /**
   * Retrieves the followers of a given user either from a cache or from a service.
   * @param userId The ID of the user whose followers to retrieve.
   * @returns A Promise of an array of IFollowerData objects representing the user's followers.
   */
  private async followers(userId: string): Promise<IFollowerData[]> {
    // Check if there are any cached followers for the given userId
    const cachedFollowers: IFollowerData[] = await followerCache.getFollowersFromCache(`followers${userId}`);

    // If there are cached followers, return them
    if (cachedFollowers.length) {
      return cachedFollowers;
    }

    // Otherwise, retrieve the followers from the followerService and return them
    const result = (await followerService.getFollowerData(new mongoose.Types.ObjectId(userId))) as IFollowerData[];
    return result;
  }
}
