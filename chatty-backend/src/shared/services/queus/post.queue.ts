import { BaseQueue } from './base.queue';
import { IPostJobData } from '@post/interfaces/post.interface';
import { postWorker } from '@worker/post.worker';

class PostQueue extends BaseQueue {
  // This code sets up a job queue to process jobs in the background.
  // It is used when a user creates a post, and then the post is saved to the database.
  // It is also used when a user deletes a post, and then the post is deleted from the database.
  // The job queue is used to prevent the UI from hanging when the user is trying to create or delete a post.
  // The job queue is also used to prevent the database from being overloaded by too many requests to create or delete a post.
  constructor() {
    super('post');
    this.processJob('addPostToDB', 5, postWorker.savePostToDB);
    this.processJob('deletePostFromDb', 5, postWorker.delePostFromDB);
    this.processJob('updatePostInDB', 5, postWorker.updatePostInDB);
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
