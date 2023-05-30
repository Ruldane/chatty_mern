import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { imageService } from '@service/db/image.service';

const log: Logger = config.createLogger('imageWorker');

class ImageWorker {
  /**
   * Adds user profile image to the database
   * @param {Job} job - The job to be performed
   * @param {DoneCallback} done - Callback to be fired after the job is processed
   * @return {Promise<void>}
   */
  async addUserProfileImageToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, value, imgId, imgVersion } = job.data;
      await imageService.addUserProfileImageToDB(key, value, imgId, imgVersion);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  /**
   * Updates background image in the database
   * @param {Job} job - The job to be performed
   * @param {DoneCallback} done - Callback to be fired after the job is processed
   * @return {Promise<void>}
   */
  async updateBGImageInDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, imgId, imgVersion } = job.data;
      await imageService.addBackgroundImageToDB(key, imgId, imgVersion);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  /**
   * Adds image to the database
   * @param {Job} job - The job to be performed
   * @param {DoneCallback} done - Callback to be fired after the job is processed
   * @return {Promise<void>}
   */
  async addImageToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, imgId, imgVersion } = job.data;
      await imageService.addImage(key, imgId, imgVersion, '');
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  /**
   * Removes image from the database
   * @param {Job} job - The job to be performed
   * @param {DoneCallback} done - Callback to be fired after the job is processed
   * @return {Promise<void>}
   */
  async removeImageFromDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { imageId } = job.data;
      await imageService.removeImageFromDB(imageId);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const imageWorker: ImageWorker = new ImageWorker();
