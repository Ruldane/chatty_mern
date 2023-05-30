import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { commentService } from '@service/db/comment.service';

const log: Logger = config.createLogger('commentWorker');

class CommentWorker {
  /**
   * Adds a comment to the database.
   * @param job - The Bull job object.
   * @param done - The callback function to be called when the job is done.
   */
  async addCommentToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { data } = job;
      await commentService.addCommentToDB(data);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const commentWorker: CommentWorker = new CommentWorker();
