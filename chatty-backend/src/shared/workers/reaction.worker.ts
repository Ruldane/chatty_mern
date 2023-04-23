import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { reactionService } from '@service/db/reaction.service';

const log: Logger = config.createLogger('ReactionWorker');

class ReactionWorker {
  async addReactionToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { data } = job;
      // add method to send data to database
      await reactionService.addReactionToDb(data);
      job.progress(100);
      done(null, data);
    } catch (error) {
      log.error('AuthWorker error: ', error);
      done(error as Error);
    }
  }

  /**
   * Asynchronously removes a reaction from the database.
   * @param job The job object containing data to remove.
   * @param done The callback function to call when the job is done.
   * @returns Promise<void>
   */
  async removeReactionToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { data } = job; // Destructure data from job object
      await reactionService.removeReactionDataFromDB(data); // Remove reaction data from the database
      job.progress(100); // Update job progress to 100%
      done(null, data); // Call the done callback with no error and the original data
    } catch (error) {
      log.error('AuthWorker error: ', error); // Log any errors that occur
      done(error as Error); // Call the done callback with the error
    }
  }
}

export const reactionWorker: ReactionWorker = new ReactionWorker();
