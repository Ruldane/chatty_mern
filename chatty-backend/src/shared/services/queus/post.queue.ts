import { IAuthJob } from '@auth/interfaces/auth.interface';
import { authWorker } from '@worker/auth.worker';
import { BaseQueue } from './base.queue';
import { IPostJobData } from '@post/interfaces/post.interface';
import { postWorker } from '@worker/post.worker';

class PostQueue extends BaseQueue {
  constructor() {
    super('post');
    this.processJob('addPostToDB', 5, postWorker.savePostToDB);
  }

  /**
   * Adds an authentication job to the job queue.
   *
   * @param name  The name of the job.
   * @param data  The data for the job.
   */
  public addPostJob(name: string, data: IPostJobData): void {
    this.addJob(name, data);
  }
}

export const postQueue: PostQueue = new PostQueue();
