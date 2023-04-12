import { Request, Response } from 'express';
import { UserCache } from '@service/redis/user.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import { userService } from '@service/db/user.service';
import HTTP_STATUS from 'http-status-codes';

const userCache: UserCache = new UserCache();

export class CurrentUser {
  // This function is called in the userController to check whether the user is logged in or not
  // It will check if the user is logged in by checking if the user exists in the cache and if not, it will check if the user exists in the database
  // If the user exists in the cache, it will return the user from the cache and if not, it will return the user from the database
  // If the user exists, the isUser variable will be set to true and the token and user variables will be set to the current token and user
  // The status of the response will be set to 200 and the response will be returned as JSON
  // The JSON object will be set to the isUser variable, the token variable, and the user variable
  // If the user does not exist, the status of the response will be set to 200 and the response will be returned as JSON
  // The JSON object will be set to the isUser variable, null, and null
  public async read(req: Request, res: Response): Promise<void> {
    let isUser = false;
    let token = null;
    let user = null;
    const cacheUser: IUserDocument = (await userCache.getUserFromCache(`${req.currentUser!.userId}`)) as IUserDocument;
    const existingUser: IUserDocument = cacheUser
      ? cacheUser
      : ((await userService.getUserById(`${req.currentUser!.uId}`)) as IUserDocument);
    if (Object.keys(existingUser).length) {
      isUser = true;
      token = req.session?.jwt;
      user = existingUser;
    }
    res.status(HTTP_STATUS.OK).json({ isUser, token, user });
  }
}
