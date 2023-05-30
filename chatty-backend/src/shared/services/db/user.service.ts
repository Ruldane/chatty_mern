import { IBasicInfo, INotificationSettings, ISearchUser, ISocialLinks, IUserDocument } from '@user/interfaces/user.interface';
import { UserModel } from '@user/models/user.schema';
import mongoose from 'mongoose';
import { followerService } from './follower.service';
import { AuthModel } from '@auth/models/auth.schema';

class UserService {
  /**
   * Adds the given user data to the database.
   * @param data The user data to add to the database.
   */
  public async addUserData(data: IUserDocument): Promise<void> {
    await UserModel.create(data);
  }

  /**
   * Get a user by its ID
   *
   * @param userId the user ID
   * @returns the user
   */
  /**
   * Get a user by its ID
   *
   * @param userId the ID of the user to retrieve
   * @returns the user with the specified ID, or undefined if no such user exists
   */
  public async getUserById(userId: string): Promise<IUserDocument> {
    // Query the UserModel to find the user with the specified ID
    const users: IUserDocument[] = await UserModel.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      // Lookup the user's auth information from the Auth collection
      { $lookup: { from: 'Auth', localField: 'authId', foreignField: '_id', as: 'authId' } },
      // Unwind the authId array (since the lookup returns an array even though we only expect one result)
      { $unwind: '$authId' },
      // Project the data we want to return from the aggregate query
      { $project: this.aggregateProject() }
    ]);
    // Return the first user in the array (if there are any users)
    return users[0];
  }

  /**
   * Updates the password of a user with the given ID.
   * @param userId The ID of the user to update.
   * @param hashedPassword The hashed password to set for the user.
   * @returns A Promise that resolves when the update is complete.
   */
  public async updatePassword(username: string, hashedPassword: string): Promise<void> {
    // Use the updateOne method of the UserModel to update the password of the user with the given ID
    await AuthModel.updateOne({ username }, { $set: { password: hashedPassword } }).exec();
  }

  /**
   * Updates the notification settings of a user.
   * @param userId - The ID of the user to update.
   * @param settings - The updated notification settings.
   */
  public async updateNotificationSettings(userId: string, settings: INotificationSettings): Promise<void> {
    // Update the notification settings in the database for the specified user ID
    await UserModel.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { notifications: settings } }).exec();
  }

  /**
   * Updates the basic information of a user with the given ID.
   * @param userId The ID of the user to update.
   * @param info An object containing the updated basic information.
   * @returns A Promise that resolves when the update is complete.
   */
  public async updateUserInfo(userId: string, info: IBasicInfo): Promise<void> {
    // Use the updateOne method of the UserModel to update the basic information of the user with the given ID
    await UserModel.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          work: info['work'],
          school: info['school'],
          quote: info['quote'],
          location: info['location']
        }
      }
    ).exec();
  }

  /**
   * Updates the social links of a user with the given ID.
   * @param userId The ID of the user to update.
   * @param links An object containing the updated social links.
   * @returns A Promise that resolves when the update is complete.
   */
  public async updateSocialLinks(userId: string, links: ISocialLinks): Promise<void> {
    await UserModel.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $set: {
          social: links
        }
      }
    ).exec();
  }

  /**
   * Retrieves all users with a specific userId, skipping a certain number of users,
   * and limiting the number of users returned.
   *
   * @param userId - The ID of the user to retrieve.
   * @param skip - The number of users to skip.
   * @param limit - The maximum number of users to retrieve.
   * @returns A Promise that resolves to an array of IUserDocument objects.
   */
  public async getAllUsers(userId: string, skip: number, limit: number): Promise<IUserDocument[]> {
    // Query for users that not match the provided userId, skipping "skip" number of users,
    // limiting to "limit" number of users, sorting by createdAt, and performing a lookup
    // on the "Auth" collection to retrieve the associated authId.
    const users: IUserDocument[] = await UserModel.aggregate([
      { $match: { _id: { $ne: new mongoose.Types.ObjectId(userId) } } },
      { $skip: skip },
      { $limit: limit },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'Auth', localField: 'authId', foreignField: '_id', as: 'authId' } },
      { $unwind: '$authId' },
      { $project: this.aggregateProject() }
    ]);

    // Return the retrieved users.
    return users;
  }

  /**
   * Retrieves a list of random users from the database, excluding the user with the given ID and the current user's followers.
   * @param userId The ID of the current user.
   * @returns A Promise of an array of IUserDocument objects representing the random users.
   */
  public async getRandomUsers(userId: string): Promise<IUserDocument[]> {
    // Initialize an empty array to store the resulting user documents
    const randomUsers: IUserDocument[] = [];

    // Retrieve all users from the database except for the current user
    const users: IUserDocument[] = await UserModel.aggregate([
      { $match: { _id: { $ne: new mongoose.Types.ObjectId(userId) } } },
      // Join the Auth collection to retrieve additional user data
      { $lookup: { from: 'Auth', localField: 'authId', foreignField: '_id', as: 'authId' } },
      { $unwind: '$authId' },
      // Select a random sample of 10 users
      { $sample: { size: 10 } },
      // Add additional fields to the user documents
      {
        $addFields: {
          username: '$authId.username',
          email: '$authId.email',
          avatarColor: '$authId.avatarColor',
          uId: '$authId.uId',
          createdAt: '$authId.createdAt'
        }
      },
      // Remove unnecessary fields from the user documents
      {
        $project: {
          authId: 0,
          __v: 0
        }
      }
    ]);

    // Retrieve the current user's followers
    const followers: string[] = await followerService.getFolloweeIds(userId);

    // Iterate over the selected users and add them to the randomUsers array if they are not followers of the current user
    for (const user of users) {
      const followerIndex = followers.indexOf(user._id.toString());
      if (followerIndex < 0) {
        randomUsers.push(user);
      }
    }

    // Return the resulting array of user documents
    return randomUsers;
  }

  /**
   * Get a user by its Auth Id
   *
   * @param authId the user ID
   * @returns the user
   */
  public async getUserByAuthId(authId: string): Promise<IUserDocument> {
    const users: IUserDocument[] = await UserModel.aggregate([
      { $match: { authId: new mongoose.Types.ObjectId(authId) } },
      // lookup references from User to Auth
      { $lookup: { from: 'Auth', localField: 'authId', foreignField: '_id', as: 'authId' } },
      // return as an object
      { $unwind: '$authId' },
      { $project: this.aggregateProject() }
    ]);
    return users[0];
  }

  /**
   * Searches for users in the database whose username matches the given regular expression.
   * @param regex The regular expression to match against usernames.
   * @returns A Promise of an array of ISearchUser objects representing the matching users.
   */
  public async searchUsers(regex: RegExp): Promise<ISearchUser[]> {
    // Use the aggregate method of the AuthModel to search for users whose username matches the given regular expression
    const users = await AuthModel.aggregate([
      { $match: { username: regex } },
      // Lookup the user's auth information from the Auth collection
      { $lookup: { from: 'User', localField: '_id', foreignField: 'authId', as: 'user' } },
      { $unwind: '$user' },
      // Project only the necessary fields from the user document
      {
        $project: {
          _id: '$user._id',
          username: 1,
          email: 1,
          avatarColor: 1,
          profilePicture: 1
        }
      }
    ]);
    // Return the resulting array of ISearchUser objects
    return users;
  }

  private aggregateProject() {
    return {
      // to exclude some properties from the result, 0 mean don't return property, 1 return property
      _id: 1,
      // will work only if we use $unwind
      username: '$authId.username',
      uId: '$authId.uId',
      email: '$authId.email',
      avatarColor: '$authId.avatarColor',
      createdAt: '$authId.createdAt',
      postsCount: 1,
      work: 1,
      school: 1,
      quote: 1,
      location: 1,
      blocked: 1,
      blockedBy: 1,
      followersCount: 1,
      followingCount: 1,
      notifications: 1,
      social: 1,
      bgImageVersion: 1,
      bgImageId: 1,
      profilePicture: 1
    };
  }

  public async getTotalUserInDB(): Promise<number> {
    const totalCount: number = await UserModel.find({}).countDocuments();
    return totalCount;
  }
}

export const userService: UserService = new UserService();
