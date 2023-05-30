import { BaseQueue } from './base.queue';
import { IBlockedUserJobData } from '@follower/interfaces/follower.interface';
import { blockedUserWorker } from '@worker/blocked.worker';

class BlockedUserQueue extends BaseQueue {
  constructor() {
    super('blockedUsers');
    this.processJob('addBlockedUserToDB', 5, blockedUserWorker.addBlockedUserToDB);
    this.processJob('removeBlockedUserFromDB', 5, blockedUserWorker.addBlockedUserToDB);
  }

  public addBlockedUser(name: string, data: IBlockedUserJobData): void {
    this.addJob(name, data);
  }
}

export const blockedUserQueue: BlockedUserQueue = new BlockedUserQueue();
