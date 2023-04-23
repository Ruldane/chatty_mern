import { IGetPostsQuery, IPostDocument, IQueryComplete } from '@post/interfaces/post.interface';
import { PostModel } from '@post/models/post.schema';
import { IUserDocument } from '@user/interfaces/user.interface';
import { UserModel } from '@user/models/user.schema';
import { Query, UpdateQuery } from 'mongoose';
import { IQueryDeleted } from '../../../features/post/interfaces/post.interface';
import { updatedPost } from '../../../mocks/post.mock';

class PostService {
  public async addPostToDB(userId: string, createdPost: IPostDocument): Promise<void> {
    console.log('PostService::addPostToDB');
    const post: Promise<IPostDocument> = PostModel.create(createdPost);
    const user: UpdateQuery<IUserDocument> = UserModel.updateOne({ _id: userId }, { $inc: { postsCount: 1 } });
    await Promise.all([post, user]);
  }

  /**
   * Retrieves an array of posts from the database that match the given query, sorted using the provided sorting object,
   * and paginated using skip and limit.
   * @param query The query object used to filter the posts.
   * @param skip The number of posts to skip before returning results.
   * @param limit The maximum number of posts to return.
   * @param sort The object used to sort the posts. Each key is a field to sort by, and the value is 1 for ascending or -1 for descending.
   * @returns An array of post documents.
   */
  public async getPosts(query: IGetPostsQuery, skip = 0, limit = 0, sort: Record<string, 1 | -1>): Promise<IPostDocument[]> {
    let postQuery = {};

    // If both imgId and gifUrl are provided in query, search for posts that have either.
    if (query?.imgId && query?.gifUrl) {
      postQuery = { $or: [{ imgId: { $ne: '' } }, { giftUrl: { $ne: '' } }] };
    } else {
      // Otherwise, use the query object as-is.
      postQuery = query;
    }

    // Use the PostModel aggregate function to retrieve posts matching the given query, sorted and paginated as needed.
    const posts: IPostDocument[] = await PostModel.aggregate([{ $match: postQuery }, { $sort: sort }, { $skip: skip }, { $limit: limit }]);

    return posts;
  }

  public async postsCount(): Promise<number> {
    const count: number = await PostModel.find({}).countDocuments();
    return count;
  }

  public async deletePost(postId: string, userId: string): Promise<void> {
    const deletePost: Query<IQueryComplete & IQueryDeleted, IPostDocument> = PostModel.deleteOne({ _id: postId });
    const decrementPostCount: UpdateQuery<IUserDocument> = UserModel.updateOne({ _id: userId }, { $inc: { postsCount: -1 } });
    await Promise.all([deletePost, decrementPostCount]);
    // delete reaction and comments
  }

  public async editPost(postId: string, updatedPost: IPostDocument): Promise<void> {
    const updatePost: UpdateQuery<IPostDocument> = PostModel.updateOne({ _id: postId }, { $set: updatedPost });
    await Promise.all([updatePost]);
    // delete reaction and comments
  }
}

export const postService: PostService = new PostService();
