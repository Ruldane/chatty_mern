// import ObjectId
import { ObjectId } from 'mongodb';
// import Request and Response
import { Request, Response } from 'express';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { signupSchema } from '@auth/schemes/signup';
import { IAuthDocument, ISignUpData } from '@auth/interfaces/auth.interface';
import { authService } from '@service/db/auth.service';
import { BadRequestError } from '@global/helpers/error-handler';
import { Helpers } from '@global/helpers/helpers';
import { UploadApiOptions } from 'cloudinary';
import { uploads } from '@global/helpers/cloudinary-upload';
import HTTP_STATUS from 'http-status-codes';
import { IUserDocument } from '@user/interfaces/user.interface';
import { UserCache } from '@service/redis/user.cache';
import { config } from '@root/config';
import { omit } from 'lodash';
import JWT from 'jsonwebtoken';
import { authQueue } from '@service/queus/auth.queue';
import { userQueue } from '@service/queus/user.queue';

const userCache: UserCache = new UserCache();

export class SignUp {
  // decorator joiValidation
  @joiValidation(signupSchema)
  // Create a user
  public async create(req: Request, res: Response): Promise<void> {
    // get params from body
    const { username, email, password, avatarColor, avatarImage } = req.body;
    // call helpers function to check if user exists
    const checkIfUserExists: IAuthDocument = await authService.getUserByUsernameOrEmail(username, email);
    // check if user exists
    if (checkIfUserExists) {
      // throw error
      throw new BadRequestError('Invalide credentials');
    }
    const authObjectId: ObjectId = new ObjectId();
    const userObjectId: ObjectId = new ObjectId();
    const uId = `${Helpers.generateRandomIntegers(12)}`;

    /**
     * This method is used to create an auth document for the user.
     * @param data The data to be stored in the document.
     */
    const authData: IAuthDocument = SignUp.prototype.signupData({
      _id: authObjectId,
      uId,
      username,
      email,
      password,
      avatarColor
    });

    // The API call to Cloudinary to upload the avatar image
    // The `public_id` property contains the file name of the uploaded image
    // If the upload fails, an error is thrown
    const result: UploadApiOptions = (await uploads(avatarImage, `${userObjectId}`, true, true)) as UploadApiOptions;
    if (!result?.public_id) {
      throw new BadRequestError('File upload failed');
    }

    /**
     * The function returns user data with profile image.
     * Add to redis Cache
     * @param authData - The data of the current user.
     * @param userObjectId - The id of the current user.
     * @returns {Promise<IUserDocument>} - The data of the current user.
     */
    const userDataForCache: IUserDocument = SignUp.prototype.userData(authData, userObjectId);
    userDataForCache.profilePicture = `https://res.cloudinary.com/${config.CLOUD_NAME}/image/upload/v${result.version}/${userObjectId}`;
    await userCache.saveUserToCache(`${userObjectId}`, uId, userDataForCache);

    // delete from userForCach
    const userResult = omit(userDataForCache, ['uId', 'username', 'email', 'avatarColor', 'password']);
    // Add to database Redis
    authQueue.addAuthUserJob('addAuthUserToDB', {
      value: authData
    });

    userQueue.addUserJob('addUserToDB', {
      value: userResult
    });
    const userJwt: string = SignUp.prototype.signToken(authData, userObjectId);

    req.session = {
      jwt: userJwt
    };

    res.status(HTTP_STATUS.CREATED).json({ message: 'User created successfully', user: userDataForCache, token: userJwt });
  }

  private signToken(data: IAuthDocument, userObjectId: ObjectId): string {
    return JWT.sign(
      {
        userId: userObjectId,
        uId: data.uId,
        email: data.email,
        username: data.username,
        avatarColor: data.avatarColor
      },
      config.JWT_TOKEN!
    );
  }

  /**
   *
   * @param data - signUpData()
   * @returns IAuthDocument
   */
  private signupData(data: ISignUpData): IAuthDocument {
    const { _id, uId, username, email, password, avatarColor } = data;
    return {
      _id,
      uId,
      username: Helpers.firstLetterUpperCase(username),
      email: Helpers.loverCase(email),
      password,
      avatarColor,
      createdAt: new Date()
    } as unknown as IAuthDocument;
  }

  private userData(data: IAuthDocument, userObjectId: ObjectId): IUserDocument {
    const { _id, username, email, uId, password, avatarColor } = data;
    return {
      _id: userObjectId,
      authId: _id,
      uId,
      username: Helpers.firstLetterUpperCase(username),
      email,
      password,
      avatarColor,
      profilePicture: '',
      blocked: [],
      blockedBy: [],
      work: '',
      location: '',
      school: '',
      quote: '',
      bgImageVersion: '',
      bgImageId: '',
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      notifications: {
        messages: true,
        comments: true,
        follows: true,
        reactions: true
      },
      social: {
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: ''
      }
    } as unknown as IUserDocument;
  }
}
