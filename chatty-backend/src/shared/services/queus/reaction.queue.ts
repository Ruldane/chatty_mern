import { reactionWorker } from '@worker/reaction.worker';
import { BaseQueue } from './base.queue';
import { IReactionJob } from '@reaction/interfaces/reaction.interface';

class ReactionQueue extends BaseQueue {
  constructor() {
    super('reactions');
    this.processJob('addReactionToDB', 5, reactionWorker.addReactionToDB);
    this.processJob('removeReactionFromDB', 5, reactionWorker.removeReactionToDB);
  }

  /**
   * Adds an authentication job to the job queue.
   *
   * @param name  The name of the job.
   * @param data  The data for the job.
   */
  public addReactionJob(name: string, data: IReactionJob): void {
    this.addJob(name, data);
  }
}

export const reactionQueue: ReactionQueue = new ReactionQueue();
