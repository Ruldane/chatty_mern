import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { AuthModel } from '@auth/interfaces/auth.schema';
import { Helpers } from '@global/helpers/helpers';

/**
 * Get user by username or email
 * @param username
 * @param email
 * @returns {Promise<IAuthDocument>}
 */
class AuthService {
  public async createAuthUser(data: IAuthDocument): Promise<void> {
    await AuthModel.create(data);
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
}

export const authService: AuthService = new AuthService();
