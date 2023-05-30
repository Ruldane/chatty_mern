import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { blockUserService } from '@service/db/block-user.service';

const log: Logger = config.createLogger('emailWorker');

class BlockedUserWorker {
  /**
   * This methode is used to send a mail to the user.
   * @param job - This is the job that is being processed by the queue.
   * @param done - This is the callback function that is called when the processing is done.
   */

  async addBlockedUserToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { keyOne, keyTwo, type } = job.data;
      if (type === 'block') {
        await blockUserService.blockUser(keyOne, keyTwo);
      } else {
        await blockUserService.unblockUser(keyOne, keyTwo);
      }
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const blockedUserWorker: BlockedUserWorker = new BlockedUserWorker();
