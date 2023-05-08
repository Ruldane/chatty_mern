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
  public async image(req: Request, res: Response): Promise<void> {
    const { imageId } = req.params;
    socketIOImageObject.emit('delete image', imageId);

    // Adds a job to the image queue for processing
    imageQueue.addImageJob('removeImageFromDB', {
      imageId
    });

    // Returns a OK status code and success message to the client
    res.status(HTTP_STATUS.OK).json({ message: 'Image deleted successfully' });
  }

  public async backgroundImage(req: Request, res: Response): Promise<void> {
    const image: IFileImageDocument = await imageService.getImageByBackgroundId(req.params.bgImageId);
    socketIOImageObject.emit('delete image', image?._id);
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

    Delete.prototype.deleteImageFromDB(req, res);
    (await Promise.all([bgImageId, bgImageVersion])) as [IUserDocument, IUserDocument];
    imageQueue.addImageJob('removeImageFromDB', {
      imageId: image?._id
    });
    res.status(HTTP_STATUS.OK).json({ message: 'Image deleted successfully' });
  }

  private async deleteImageFromDB(req: Request, res: Response): Promise<void> {
    await UserModel.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(req.currentUser!.userId)
      },
      { $set: { bgImageId: '', bgImageVersion: '' } }
    ).exec();
  }
}
