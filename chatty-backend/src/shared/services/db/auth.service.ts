import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { AuthModel } from '@auth/models/auth.schema';
import { Helpers } from '@global/helpers/helpers';

/**
 * Get user by username or email
 * @param username
 * @param email
 * @returns {Promise<IAuthDocument>}
 */
class AuthService {
  /**
   * Creates a new user in the database.
   *
   * @param data The user data.
   */
  public async createAuthUser(data: IAuthDocument): Promise<void> {
    await AuthModel.create(data);
  }
  /**
   * This function updates the passwordResetToken and passwordResetExpires fields in the Auth model
   * @param authId The ID for the Auth model
   * @param token The token value
   * @param tokenExpiration The token expiration time
   */
  public async updatePasswordToken(authId: string, token: string, tokenExpiration: number): Promise<void> {
    await AuthModel.updateOne(
      {
        _id: authId
      },
      {
        passwordResetToken: token,
        passwordResetExpires: tokenExpiration
      }
    );
  }
  /**
   * Gets the user by username or email.
   * @param {string} username The username.
   * @param {string} email The email.
   * @returns {Promise<IAuthDocument>} The user.
   **/
  public async getUserByUsernameOrEmail(username: string, email: string): Promise<IAuthDocument> {
    const query = {
      $or: [
        { username: Helpers.firstLetterUpperCase(username) },
        {
          email: Helpers.loverCase(email)
        }
      ]
    };
    const user: IAuthDocument = (await AuthModel.findOne(query).exec()) as IAuthDocument;
    return user;
  }

  /**
   * This function gets an auth user by their username.
   * @param username The username of the auth user to get.
   * @returns The auth user if found, null otherwise.
   */
  public async getAuthUserByUsername(username: string): Promise<IAuthDocument> {
    const user: IAuthDocument = (await AuthModel.findOne({ username: Helpers.firstLetterUpperCase(username) }).exec()) as IAuthDocument;
    return user;
  }

  /**
   * Gets a user by email
   * @param email Email of the user
   * @returns Returns a user
   */
  public async getAuthUserByEmail(email: string): Promise<IAuthDocument> {
    const user: IAuthDocument = (await AuthModel.findOne({ email: Helpers.loverCase(email) }).exec()) as IAuthDocument;
    return user;
  }

  public async getAuthUserByPasswordToken(token: string): Promise<IAuthDocument> {
    const user: IAuthDocument = (await AuthModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    }).exec()) as IAuthDocument;
    return user;
  }
}

export const authService: AuthService = new AuthService();
