import { Helpers } from '@global/helpers/helpers';
import { INotificationDocument, INotificationTemplate } from '@notification/interfaces/notification.interface';
import { NotificationModel } from '@notification/models/notification.schema';
import { IPostDocument } from '@post/interfaces/post.interface';
import { PostModel } from '@post/models/post.schema';
import { IQueryReaction, IReactionDocument, IReactionJob } from '@reaction/interfaces/reaction.interface';
import { ReactionModel } from '@reaction/models/reaction.schema';
import { notificationTemplate } from '@service/emails/templates/notifications/notification.template';
import { emailQueue } from '@service/queus/email.queue';
import { UserCache } from '@service/redis/user.cache';
import { socketIONotificationObject } from '@socket/notification';
import { IUserDocument } from '@user/interfaces/user.interface';
import { omit } from 'lodash';
import mongoose from 'mongoose';

const userCache: UserCache = new UserCache();

class ReactionService {
  /**
   * This function adds a reaction to a database and updates the corresponding post's reaction count.
   * @param reaction The parameter "reaction" is an object of type IReactionJob, which contains
   * information about a reaction to be added to the database. The properties of this object include
   * postId, username, userTo, userFrom, type, previousReaction, and reactionObject.
   */
  public async addReactionToDb(reaction: IReactionJob): Promise<void> {
    // Extract the necessary properties from the reaction object
    const { postId, username, userTo, userFrom, type, previousReaction, reactionObject } = reaction;

    // If the previous reaction exists, remove the _id property from the reactionObject
    let updatedReactionObject: IReactionDocument = reactionObject as IReactionDocument;
    if (previousReaction) {
      updatedReactionObject = omit(reactionObject, ['_id']);
    }

    // Update the user, reaction, and post in parallel
    const updatedReaction: [IUserDocument, IReactionDocument, IPostDocument] = (await Promise.all([
      userCache.getUserFromCache(`${userTo}`), // Get the user from the cache
      ReactionModel.replaceOne({ postId, type: previousReaction, username }, updatedReactionObject, { upsert: true }), // Replace the existing reaction or insert a new one
      PostModel.findOneAndUpdate(
        { _id: postId },
        {
          $inc: {
            [`reactions.${previousReaction}`]: -1, // Decrement the count of the previous reaction
            [`reactions.${type}`]: 1 // Increment the count of the new reaction
          }
        },
        { new: true } // Return the updated document
      )
    ])) as unknown as [IUserDocument, IReactionDocument, IPostDocument];
    if (updatedReaction[0]?.notifications.reactions && userTo !== userFrom) {
      // Create a new notification document.
      const notificationModel: INotificationDocument = new NotificationModel() as INotificationDocument;
      const notifications = await notificationModel.insertNotification({
        userFrom: userFrom as string,
        userTo: userTo as string,
        message: `${username} reacted to your post!`,
        notificationType: 'reactions',
        entityId: new mongoose.Types.ObjectId(postId),
        createdItemId: new mongoose.Types.ObjectId(updatedReaction[1]._id),
        comment: '',
        post: updatedReaction[2].post!,
        imgId: updatedReaction[2].imgId!,
        imgVersion: updatedReaction[2].imgVersion!,
        gifUrl: updatedReaction[2].gifUrl!,
        reaction: type!,
        createdAt: new Date()
      });

      // Send the notification to the followee's client with socketio.
      socketIONotificationObject.emit('insert notification', notifications, { userTo });

      // Send the notification to the followee's email queue.
      const templateParams: INotificationTemplate = {
        username: updatedReaction[0].username!,
        message: `${username} reacted to your post!`,
        header: 'Post Reaction Notification'
      };
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);
      emailQueue.addEmailJob('reactionsEmail', {
        receiverEmail: updatedReaction[0].email!,
        subject: `${username} reacted to your post!`,
        template
      });
    }
  }

  /**
   * Removes reaction data from the database for a given reaction job.
   * @param reactionData The reaction job containing the data to remove.
   * @returns A promise that resolves when the data is removed.
   */
  public async removeReactionDataFromDB(reactionData: IReactionJob): Promise<void> {
    // Destructure the `reactionData` object to get the `postId`, `previousReaction`, and `username` values.
    const { postId, previousReaction, username } = reactionData;

    // Delete the reaction data from the `ReactionModel` collection where the `postId`, `type`, and `username` match the given values.
    await ReactionModel.deleteOne({ postId, type: previousReaction, username });

    // Update the `reactions` field of the post with the given `postId` to decrement the count of the `previousReaction` key by 1.
    // The `new: true` option returns the updated document instead of the original.
    await PostModel.updateOne(
      { _id: postId },
      {
        $inc: {
          [`reactions.${previousReaction}`]: -1
        }
      },
      { new: true }
    );
  }

  /**
   * Retrieves post reactions based on the provided query and sort parameters
   * @param query - An IQueryReaction object specifying the query parameters
   * @param sort - A Record object specifying the sort order
   * @returns A Promise containing an array of IReactionDocument objects and the length of the array
   */
  public async getPostReactions(query: IQueryReaction, sort: Record<string, 1 | -1>): Promise<[IReactionDocument[], number]> {
    // Use the ReactionModel to aggregate reactions based on the provided query and sort parameters
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([{ $match: query }, { $sort: sort }]);

    // Return the array of reactions and its length as a tuple
    return [reactions, reactions.length];
  }

  /**
   * Get a single post reaction by post ID and username
   * @param postId - ID of the post to search for
   * @param username - Username of the user who reacted to the post
   * @returns An array containing the first reaction that matches the post ID and username, and the total number of reactions
   */
  public async getSinglePostReactionByUsername(postId: string, username: string): Promise<[IReactionDocument, number] | []> {
    // Find all reactions that match the post ID and username
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      {
        $match: { postId: new mongoose.Types.ObjectId(postId), username: Helpers.firstLetterUpperCase(username) }
      }
    ]);

    // Return the first matching reaction and the total number of reactions
    return reactions.length ? [reactions[0], reactions.length] : [];
  }

  /**
   * Retrieves all reactions to a post by a specific user.
   * @param {string} postId - The ID of the post to retrieve reactions for.
   * @param {string} username - The username of the user to retrieve reactions for.
   * @returns {Promise<IReactionDocument[]>} - A Promise that resolves to an array of reaction documents.
   */
  public async getReactionsByUsername(username: string): Promise<IReactionDocument[]> {
    // Use the ReactionModel to perform an aggregation that retrieves all reactions for a specific username.
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      {
        $match: { username: Helpers.firstLetterUpperCase(username) }
      }
    ]);

    // Return the retrieved reactions.
    return reactions;
  }
}

export const reactionService: ReactionService = new ReactionService();
