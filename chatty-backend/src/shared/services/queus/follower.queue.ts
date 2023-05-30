import { IEmailJob } from '@user/interfaces/user.interface';
import { BaseQueue } from './base.queue';
import { emailWorker } from '@worker/email.worker';
import { followerWorker } from '@worker/follower.worker';
import { IFollowerJobData } from '@follower/interfaces/follower.interface';

class FollowerQueue extends BaseQueue {
  constructor() {
    super('email');
    this.processJob('addFollowerToDB', 5, followerWorker.addFollowerToDB);
    this.processJob('removeFollowerFromDB', 5, followerWorker.removeFollowerFromDB);
  }

  public addFollowerJob(name: string, data: IFollowerJobData): void {
    this.addJob(name, data);
  }
}

export const followerQueue: FollowerQueue = new FollowerQueue();
