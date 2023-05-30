import { BaseQueue } from './base.queue';
import { userWorker } from '@worker/user.worker';
import { IUserJob } from '@user/interfaces/user.interface';
class UserQueue extends BaseQueue {
  constructor() {
    super('User');
    this.processJob('addUserToDB', 5, userWorker.addUserToDb);
    this.processJob('updateSocialLinksInDB', 5, userWorker.updateSocialLinks);
    this.processJob('updateBasicInfoInDB', 5, userWorker.updateUserInfo);
    this.processJob('updateNotificationSettings', 5, userWorker.updateNotificationSettings);
  }

  /**
   * Adds a job to the queue, with the given name and data.
   *
   * @param name The name of the job.
   * @param data The data to pass to the job.
   * @memberof BaseQueue
   * @returns void
   **/
  public addUserJob(name: string, data: IUserJob): void {
    this.addJob(name, data);
  }
}

export const userQueue: UserQueue = new UserQueue();
