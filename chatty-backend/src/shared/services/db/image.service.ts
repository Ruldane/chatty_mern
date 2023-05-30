import { IFileImageDocument } from '@image/interfaces/image.interface';
import { ImageModel } from '@image/models/image.schema';
import { UserModel } from '@user/models/user.schema';
import mongoose from 'mongoose';

class ImageService {
  /**
   * This function adds the user's profile image URL to the database by updating the corresponding user document.
   * @param userId - the ID of the user document to update.
   * @param url - the URL of the user's profile picture to be added.
   * @param imgId - the ID of the user's profile picture in the image storage service.
   * @param imgVersion - the version of the user's profile picture in the image storage service.
   */
  public async addUserProfileImageToDB(userId: string, url: string, imgId: string, imgVersion: string): Promise<void> {
    // Find and update the user document with the given user ID, setting the profilePicture field to the provided URL.
    await UserModel.findOneAndUpdate(
      {
        _id: userId
      },
      { $set: { profilePicture: url } }
    ).exec();

    await this.addImage(userId, imgId, imgVersion, 'profile');
  }

  /**
   * This function adds the user's background image URL to the database by updating the corresponding user document.
   * @param userId - the ID of the user document to update.
   * @param imgId - the ID of the user's background image in the image storage service.
   * @param imgVersion - the version of the user's background image in the image storage service.
   */
  public async addBackgroundImageToDB(userId: string, imgId: string, imgVersion: string): Promise<void> {
    // Find and update the user document with the given user ID, setting the bgImageId and bgImageVersion fields.
    // These fields represent the id and version of the background image related to this user.
    await UserModel.findOneAndUpdate(
      {
        _id: userId
      },
      { $set: { bgImageId: imgId, bgImageVersion: imgVersion } }
    ).exec();

    // Now, add the newly added background image to the database.
    await this.addImage(userId, imgId, imgVersion, 'background');
  }

  /**
   * This function adds a new image to the database by creating a new ImageModel document.
   * @param userId - the ID of the user associated with the image.
   * @param imgId - the ID of the image in the image storage service.
   * @param imgVersion - the version of the image in the image storage service.
   * @param type - the type of the image ('background' or 'profile') to be added.
   */
  public async addImage(userId: string, imgId: string, imgVersion: string, type: string): Promise<void> {
    //Create a new ImageModel document with the given parameters
    await ImageModel.create({
      userId,
      bgImageVersion: type === 'background' ? imgVersion : '',
      bgImageId: type === 'background' ? imgId : '',
      imgVersion,
      imgId
    });
  }

  public async removeImageFromDB(imageId: string): Promise<void> {
    await ImageModel.deleteOne({ _id: imageId }).exec();
  }

  public async getImageByBackgroundId(backgroundId: string): Promise<IFileImageDocument> {
    const image: IFileImageDocument = (await ImageModel.findOne({ backgroundId }).exec()) as IFileImageDocument;
    return image;
  }

  public async getImages(userId: string): Promise<IFileImageDocument[]> {
    const images: IFileImageDocument[] = (await ImageModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } }
    ])) as IFileImageDocument[];
    return images;
  }
}

export const imageService: ImageService = new ImageService();
