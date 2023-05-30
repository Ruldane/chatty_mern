import { imageService } from '@service/db/image.service';
import { IFileImageDocument } from '@image/interfaces/image.interface';
import { imageQueue } from '@service/queus/image.queue';
import { IUserDocument } from '@user/interfaces/user.interface';
import { UserCache } from '@service/redis/user.cache';
import { Request, Response } from 'express';
import { socketIOImageObject } from '@socket/image';
import HTTP_STATUS from 'http-status-codes';
import { UserModel } from '@user/models/user.schema';
import mongoose from 'mongoose';

const userCache: UserCache = new UserCache();

export class Delete {
  /**
   * Deletes an image from the DB by ID and emits a Websockets event to remove the deleted image's ID.
   * Also adds a job to the image queue for removing the image from DB processing.
   * Returns a OK status code and success message to the client.
   */
  public async image(req: Request, res: Response): Promise<void> {
    // Get the image by ID
    const { imageId } = req.params;
    // Emit a Websockets event to remove the deleted image's ID
    socketIOImageObject.emit('delete image', imageId);
    // Adds a job to the image queue for removing the image from DB processing
    imageQueue.addImageJob('removeImageFromDB', {
      imageId
    });
    // Returns a OK status code and success message to the client
    res.status(HTTP_STATUS.OK).json({ message: 'Image deleted successfully' });
  }

  /**
   * Gets the background image by the ID, deletes it from the DB and updates the user's cached info associated with the image
   * If the image ID is not found, then nothing is done
   * Emits an event to remove the deleted image's ID via Websockets
   */
  public async backgroundImage(req: Request, res: Response): Promise<void> {
    // Get the background image by the ID
    const image: IFileImageDocument = await imageService.getImageByBackgroundId(req.params.bgImageId);

    // Emit a Websockets event to remove the deleted image's ID
    socketIOImageObject.emit('delete image', image?._id);

    // Update the associated user's cached info for the background image's ID and version
    const bgImageId: Promise<IUserDocument> = userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'bgImageId',
      ''
    ) as Promise<IUserDocument>;
    const bgImageVersion: Promise<IUserDocument> = userCache.updateSingleUserItemInCache(
      `${req.currentUser!.userId}`,
      'bgImageVersion',
      ''
    ) as Promise<IUserDocument>;

    // Delete the image from the DB
    Delete.prototype.deleteImageFromDB(req, res);

    // Wait for the user's cached info to update and the image to be removed from the DB
    (await Promise.all([bgImageId, bgImageVersion])) as [IUserDocument, IUserDocument];

    // Adds a job to the image queue for removing the image from DB processing
    imageQueue.addImageJob('removeImageFromDB', {
      imageId: image?._id
    });

    // Returns a OK status code and success message to the client
    res.status(HTTP_STATUS.OK).json({ message: 'Image deleted successfully' });
  }

  /**
   * Deletes the background image from the DB by updating the user's document with empty string ID and version number
   */
  private async deleteImageFromDB(req: Request, res: Response): Promise<void> {
    await UserModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(req.currentUser!.userId)
      },
      { $set: { bgImageId: '', bgImageVersion: '' } }
    ).exec();
  }
}
