import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { userService } from '@service/db/user.service';

const log: Logger = config.createLogger('AuthWorker');

class UserWorker {
  async addUserToDb(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { value } = job.data;
      // add method to send data to database
      await userService.addUserData(value);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error('AuthWorker error: ', error);
      done(error as Error);
    }
  }
}

export const userWorker: UserWorker = new UserWorker();