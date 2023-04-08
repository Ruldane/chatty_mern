import { BaseQueue } from './base.queue';
import { userWorker } from '@worker/user.worker';
import { IAuthJob } from '@auth/interfaces/auth.interface';
class UserQueue extends BaseQueue {
  constructor() {
    super('User');
    this.processJob('addUserToDB', 5, userWorker.addUserToDb);
  }
  /**
   * Adds a job to the queue, with the given name and data.
   *
   * @param name The name of the job.
   * @param data The data to pass to the job.
   * @memberof BaseQueue
   * @returns void
   **/
  public addUserJob(name: string, data: IAuthJob): void {
    this.addJob(name, data);
  }
}

export const userQueue: UserQueue = new UserQueue();
