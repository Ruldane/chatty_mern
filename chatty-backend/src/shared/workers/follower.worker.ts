import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { followerService } from '@service/db/follower.service';

const log: Logger = config.createLogger('followerWorker');

class FollowerWorker {
  /**
   * Asynchronously adds a follower to the database
   * @param job - the Job object passed by the queue
   * @param done - the DoneCallback function passed by the queue
   * @returns a Promise that resolves to void
   */
  async addFollowerToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      // Destructure the necessary data from the job object
      const { keyOne, keyTwo, username, followerDocumentId } = job.data;

      // Call the followerService to add the follower to the database
      await followerService.addFollowerToDB(keyOne, keyTwo, username, followerDocumentId);

      // Update the job progress to 100%
      job.progress(100);

      // Call the DoneCallback function with the job data
      done(null, job.data);
    } catch (error) {
      // Log the error
      log.error(error);

      // Call the DoneCallback function with the error object
      done(error as Error);
    }
  }

  /**
   * Removes a follower from the database.
   * @async
   * @param {Job} job - The Bull job object.
   * @param {DoneCallback} done - The Bull done callback function.
   * @returns {Promise<void>}
   */
  async removeFollowerFromDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { keyOne, keyTwo } = job.data;
      // Call the follower service to remove the follower from the database.
      await followerService.removeFollowerFromDB(keyOne, keyTwo);
      // Mark the job as 100% complete.
      job.progress(100);
      // Call the done callback with no error and the job data.
      done(null, job.data);
    } catch (error) {
      // Log any errors that occurred.
      log.error(error);
      // Call the done callback with the error object.
      done(error as Error);
    }
  }
}

export const followerWorker: FollowerWorker = new FollowerWorker();
