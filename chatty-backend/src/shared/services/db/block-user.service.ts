import { UserModel } from '@user/models/user.schema';
import { BulkWriteResult, PushOperator } from 'mongodb';
import mongoose from 'mongoose';

class BlockUserService {
  /**
   * Blocks a user and adds them to the blocked list for both the user and the follower.
   * @param userId The id of the user to block.
   * @param followerId The id of the follower who is blocking the user.
   */
  public async blockUser(userId: string, followerId: string): Promise<void> {
    await UserModel.bulkWrite([
      {
        // Update the user's blocked list to add the follower.
        updateOne: {
          filter: { _id: userId, blocked: { $ne: new mongoose.Types.ObjectId(followerId) } },
          update: {
            $push: {
              blocked: new mongoose.Types.ObjectId(followerId)
            } as PushOperator<Document>
          }
        }
      },
      {
        // Update the follower's blockedBy list to add the user.
        updateOne: {
          filter: { _id: followerId, blockedBy: { $ne: new mongoose.Types.ObjectId(userId) } },
          update: {
            $push: {
              blockedBy: new mongoose.Types.ObjectId(userId)
            } as PushOperator<Document>
          }
        }
      }
    ]);
  }

  /**
   * Unblocks a user by removing their ID from the `blocked` and `blockedBy` arrays in the database.
   * @param userId - The ID of the user to unblock.
   * @param followerId - The ID of the user who is blocking `userId`.
   * @returns A Promise that resolves when the operation is complete.
   */
  public async unblockUser(userId: string, followerId: string): Promise<void> {
    // Use the `bulkWrite` method to update multiple documents in a collection.
    // Each document is updated using an `updateOne` operation.
    await UserModel.bulkWrite([
      {
        // Update the document with ID `userId`.
        // Use the `$pull` operator to remove the `followerId` from the `blocked` array.
        updateOne: {
          filter: { _id: userId },
          update: {
            $pull: {
              blocked: new mongoose.Types.ObjectId(followerId)
            } as PushOperator<Document>
          }
        }
      },
      {
        // Update the document with ID `followerId`.
        // Use the `$pull` operator to remove the `userId` from the `blockedBy` array.
        updateOne: {
          filter: { _id: followerId },
          update: {
            $pull: {
              blockedBy: new mongoose.Types.ObjectId(userId)
            } as PushOperator<Document>
          }
        }
      }
    ]);
  }
}

export const blockUserService: BlockUserService = new BlockUserService();
