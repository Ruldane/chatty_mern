import { emailQueue } from '@service/queus/email.queue';
import { notificationTemplate } from '../emails/templates/notifications/notification.template';
import { INotificationTemplate } from './../../../features/notifications/interfaces/notification.interface';
import { socketIONotificationObject } from '@socket/notification';
import { ICommentDocument, ICommentJob, ICommentNameList, IQueryComment } from '@comment/interfaces/comment.interface';
import { CommentsModel } from '@comment/models/comment.schema';
import { IPostDocument } from '@post/interfaces/post.interface';
import { PostModel } from '@post/models/post.schema';
import { UserCache } from '@service/redis/user.cache';
import { IUserDocument } from '@user/interfaces/user.interface';
import mongoose, { Query } from 'mongoose';
import { NotificationModel } from '@notification/models/notification.schema';
import { INotificationDocument } from '@notification/interfaces/notification.interface';

const userCache: UserCache = new UserCache();

class CommentService {
  public async addCommentToDB(commentData: ICommentJob): Promise<void> {
    const { postId, userTo, userFrom, username, comment } = commentData;
    const comments: Promise<ICommentDocument> = CommentsModel.create(comment);
    const post: Query<IPostDocument, IPostDocument> = PostModel.findOneAndUpdate(
      { _id: postId },
      { $push: { comments: comments } },
      { new: true }
    ) as Query<IPostDocument, IPostDocument>;
    const user: Promise<IUserDocument> = userCache.getUserFromCache(userTo) as Promise<IUserDocument>;
    const response: [ICommentDocument, IPostDocument, IUserDocument] = await Promise.all([comments, post, user]);

    // send comments to notification
    if (response[2].notifications.comments && userFrom !== userTo) {
      const notificationModel: INotificationDocument = new NotificationModel() as INotificationDocument;
      const notifications = await notificationModel.insertNotification({
        userFrom,
        userTo,
        message: `${username} commented on your post`,
        notificationType: 'comment',
        entityId: new mongoose.Types.ObjectId(postId),
        createdItemId: new mongoose.Types.ObjectId(response[1]._id),
        comment: comment.comment,
        reaction: '',
        post: response[1].post,
        imgId: response[1].imgId!,
        imgVersion: response[1].imgVersion!,
        gifUrl: response[1].gifUrl!,
        createdAt: new Date()
      });
      // send to client with socketio
      socketIONotificationObject.emit('insert notification', notifications, { userTo });

      // send to email queue
      const templateParams: INotificationTemplate = {
        username: response[2].username!,
        message: `${username} commented on your post`,
        header: 'Comment notification'
      };
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);
      emailQueue.addEmailJob('commentsEmail', {
        receiverEmail: response[2].email!,
        subject: `${username} commented on your post`,
        template
      });
    }
  }

  public async getPostComments(query: IQueryComment, sort: Record<string, 1 | -1>): Promise<ICommentDocument[]> {
    const comments: ICommentDocument[] = await CommentsModel.aggregate([{ $match: query }, { $sort: sort }]);
    return comments;
  }

  /**
   * Returns a list of comment names and counts that match the given query and are sorted using the given sort object.
   * @param query - The query object used to filter the comments.
   * @param sort - The sort object used to sort the comments.
   * @returns A Promise that resolves to an array of comment names and counts.
   */
  public async getPostCommentNames(query: IQueryComment, sort: Record<string, 1 | -1>): Promise<ICommentNameList[]> {
    const commentNamesList: ICommentNameList[] = await CommentsModel.aggregate([
      { $match: query }, // Filter the comments using the given query.
      { $sort: sort }, // Sort the comments using the given sort object.
      { $group: { _id: null, names: { $addToSet: '$username' }, count: { $sum: 1 } } }, // Group the comments by username and count the number of comments.
      { $project: { _id: 0 } } // Remove the _id field from the result.
    ]);
    return commentNamesList;
  }
}

export const commentService: CommentService = new CommentService();
