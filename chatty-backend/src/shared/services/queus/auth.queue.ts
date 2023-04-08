import { IAuthJob } from '@auth/interfaces/auth.interface';
import { authWorker } from '@worker/auth.worker';
import { BaseQueue } from './base.queue';

class AuthQueue extends BaseQueue {
  constructor() {
    super('auth');
    this.processJob('addAuthUserToDB', 5, authWorker.addAuthUserToDB);
  }

  /**
   * Adds an authentication job to the job queue.
   *
   * @param name  The name of the job.
   * @param data  The data for the job.
   */
  public addAuthUserJob(name: string, data: IAuthJob): void {
    this.addJob(name, data);
  }
}

export const authQueue: AuthQueue = new AuthQueue();
