import { BaseCache } from '@service/redis/base.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import Logger from 'bunyan';
import { config } from '@root/config';
import { ServerError } from '@global/helpers/error-handler';

const log: Logger = config.createLogger('userCache');

export class UserCache extends BaseCache {
  constructor() {
    super('userCache');
  }

  public async saveUserToCache(key: string, userUid: string, createUser: IUserDocument): Promise<void> {
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
    } = createUser;

    // This function is used to update the user's profile information.
    // The profile information is stored in the database in the form of a list of strings.
    // The updateProfile function takes a list of strings and updates the user's profile information.
    // The list of strings is in the following format: [key, value, key, value, ...]
    // The first element is the key, the second is the value, and so on.
    // For example, if the list is ['id', '123', 'username',
    const firstList: string[] = [
      '_id',
      `${_id}`,
      'uId',
      `${uId}`,
      'username',
      `${username}`,
      'email',
      `${email}`,
      'avatarColor',
      `${avatarColor}`
    ];
    // The code above is a variable declaration containing an array of strings.
    // The strings are the list of properties to be added to the object.
    // Each string is a property name and the following string is the value
    // for that property.

    const secondList: string[] = [
      'blocked',
      JSON.stringify(blocked),
      'blockedBy',
      JSON.stringify(blockedBy),
      'postsCount',
      `${postsCount}`,
      'profilePicture',
      `${profilePicture}`,
      'followersCount',
      `${followersCount}`,
      'followingCount',
      `${followingCount}`,
      'notifications',
      JSON.stringify(notifications)
    ];
    const thirdList: string[] = [
      // This code saves the user's work, location, school, quote, bgImageId, bgImageVersion, and socials to the database
      // The identifiers are 'work', 'location', 'school', 'quote', 'bgImageId', 'bgImageVersion', and 'social'
      // The purpose of this code is to save the user's profile information to the database

      'work',
      `${work}`,
      'location',
      `${location}`,
      'school',
      `${school}`,
      'quote',
      `${quote}`,
      'bgImageId',
      `${bgImageId}`,
      'bgImageVersion',
      `${bgImageVersion}`,
      'social',
      JSON.stringify(social)
    ];

    // spread the three list inside one
    const dataToSave: string[] = [...firstList, ...secondList, ...thirdList];

    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      await this.client.ZADD('user', {
        score: parseInt(userUid, 10),
        value: `${key}`
      });
      await this.client.HSET(`users:${key}`, dataToSave);
    } catch (error) {
      log.error('Save user to redis error: ' + error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
