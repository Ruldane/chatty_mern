import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { PostCache } from '@service/redis/post.cache';
import { socketIOPostObject } from '@socket/post';
import { postQueue } from '@service/queus/post.queue';

const postCache: PostCache = new PostCache();

export class Delete {
  /**
   * Asynchronously sends a delete event to a socket.io server, deletes a post from cache, adds a job to the
   * queue to delete the post from the database, and sends a success response.
   *
   * @param {Request} req - the request object containing the parameters and user information
   * @param {Response} res - the response object to send back to the client
   * @return {Promise<void>} - a promise that resolves when the function completes successfully
   */
  public async post(req: Request, res: Response): Promise<void> {
    // Emit the delete event to the socket.io server
    socketIOPostObject.emit('delete', req.params.id);
    // Delete the post from cache
    await postCache.deletePostFromCache(req.params.postId, `${req.currentUser!.userId}`);
    // Add the job to the queue
    postQueue.addPostJob('deletePostFromDB', { keyOne: req.params.postId, keyTwo: req.currentUser!.userId });
    // Send a success response
    res.status(HTTP_STATUS.OK).json({ message: 'Post deleted successfully' });
  }
}
