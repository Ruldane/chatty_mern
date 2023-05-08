import { Helpers } from '@global/helpers/helpers';
import { IBgUploadResponse } from './../interfaces/image.interface';
import { imageQueue } from './../../../shared/services/queus/image.queue';
import { IUserDocument } from './../../user/interfaces/user.interface';
import { UserCache } from '@service/redis/user.cache';
import { Request, Response } from 'express';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { addImageSchema } from '@image/schemes/images';
import { UploadApiOptions } from 'cloudinary';
import { uploads } from '@global/helpers/cloudinary-upload';
import { BadRequestError } from '@global/helpers/error-handler';
import { config } from '@root/config';
import { socketIOImageObject } from '@socket/image';
import HTTP_STATUS from 'http-status-codes';

const userCache: UserCache = new UserCache();

export class Add {
  @joiValidation(addImageSchema)
  /**
   * Handles the profile image upload process
   *
   * Uploads the image to cloudinary and sets the resulting url as the user's profile picture
   * then sends a socket.io event and adds a job to the image queue
   *
   * @param req - the incoming request object
   * @param res - the outgoing response object
   * @returns Promise<void>
   */
  public async profileImage(req: Request, res: Response): Promise<void> {
    // Uploads the image file to cloudinary and retrieves the upload result
    const result: UploadApiOptions = (await uploads(req.body.image, `${req.currentUser!.userId}`, true, true)) as UploadApiOptions;

    // Throws error and returns BAD REQUEST status code if upload is unsuccessful
    if (!result?.public_id) {
      throw new BadRequestError('File upload failed');
    }

    // Formats the resulting url with the necessary data
    const url = `https://res.cloudinary.com/${config.CLOUD_NAME}/image/upload/v${result.version}/${result.public_id}`;

    // Updates user cache with new profile picture and retrieves the updated user document
    const cachedUser: IUserDocument = (await userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'profilePicture',
      url
    )) as IUserDocument;

    // Emits a socket.io event to update the user's profile picture for all connected clients
    socketIOImageObject.emit('update user', cachedUser);

    // Adds a job to the image queue for processing
    imageQueue.addImageJob('addUserProfileImage', {
      key: `${req.currentUser!.userId}`,
      value: url,
      imgId: result.public_id,
      imgVersion: result.version.toString()
    });

    // Returns a CREATED status code and success message to the client
    res.status(HTTP_STATUS.CREATED).json({ message: 'Image added successfully' });
  }

  /**
   * Takes an image URL or data URL, uploads the image to Cloudinary
   * and returns the version and public ID.
   *
   * @param image - the image URL or data URL to upload
   * @returns Promise<IBgUploadResponse> - an object containing the image version and public ID
   */
  private async backgroundUpload(image: string): Promise<IBgUploadResponse> {
    const isDataUrl = Helpers.isDataUrl(image); // Checks if the image is a data URL
    let version = '';
    let publicId = '';
    if (isDataUrl) {
      // If the image is a data URL (Data:base64...), uploads the image to Cloudinary and retrieves the upload result
      const result: UploadApiOptions = (await uploads(image)) as UploadApiOptions;
      if (!result.public_id) {
        // Throws a BadRequestError if the image upload fails
        throw new BadRequestError(result.message);
      } else {
        // Otherwise, saves the image version and public ID from the upload result
        version = result.version.toString();
        publicId = result.public_id;
      }
    } else {
      // If the image is not a data URL, extracts the image version and public ID from the URL
      const value = image.split('/');
      version = value[value.length - 2];
      publicId = value[value.length - 1];
    }
    return { version: version.replace(/v/g, ''), publicId }; // Returns an object containing the extracted or uploaded image version and public ID
  }

  @joiValidation(addImageSchema)
  public async backgroundImage(req: Request, res: Response): Promise<void> {
    const { version, publicId } = await Add.prototype.backgroundUpload(req.body.image);

    const bgImageId: Promise<IUserDocument> = (await userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'bgImageId',
      publicId
    )) as unknown as Promise<IUserDocument>;

    const bgImageVersion: Promise<IUserDocument> = (await userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'bgImageVersion',
      version
    )) as unknown as Promise<IUserDocument>;
    const response: [IUserDocument, IUserDocument] = await Promise.all([bgImageId, bgImageVersion]);

    socketIOImageObject.emit('update user', {
      bgImageId: publicId,
      bgImageVersion: version,
      userId: response[0]
    });

    imageQueue.addImageJob('updateBGImageInDB', {
      key: `${req.currentUser!.userId}`,
      imgId: publicId,
      imgVersion: version.toString()
    });

    res.status(HTTP_STATUS.CREATED).json({ message: 'Image added successfully' });
  }
}
