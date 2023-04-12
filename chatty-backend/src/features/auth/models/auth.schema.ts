import { hash, compare } from 'bcryptjs';
import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { model, Model, Schema } from 'mongoose';

const SALT_ROUND = 10;

// 1. Define a schema for a user
// 2. Define the data type for each property in the schema
// 3. Add a default value for createdAt
// 4. Define a transform function to remove the password property when the user is serialised to JSON
const authSchema: Schema = new Schema(
  {
    username: { type: String },
    uId: { type: String },
    email: { type: String },
    password: { type: String },
    avatarColor: { type: String },
    createdAt: { type: Date, default: Date.now },
    passwordResetToken: { type: String, default: '' },
    passwordResetExpires: { type: Number }
  },
  {
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        return ret;
      }
    }
  }
);

/**
 * @description This function hashes the password before saving the document to the database
 * @param this - IAuthDocument - this is the document that is being saved
 * @param next - () => void - this is a callback to proceed to the next middleware
 * @returns void
 */
authSchema.pre('save', async function (this: IAuthDocument, next: () => void) {
  const hashedPassword: string = await hash(this.password as string, SALT_ROUND);
  this.password = hashedPassword;
  next();
});

/**
 * Add a method to the Auth schema to compare the given password with the hashed password
 * @param {string} password - The password to compare
 * @returns {Promise<boolean>} - True if the password matches
 */
authSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const hashedPassword: string = (this as unknown as IAuthDocument).password!;
  return compare(password, hashedPassword);
};

/**
 * Hashes the password with the given salt
 * @param password The password to be hashed
 * @returns The hashed password as a string
 */
authSchema.methods.hashPassword = async function (password: string): Promise<string> {
  return hash(password, SALT_ROUND);
};

const AuthModel: Model<IAuthDocument> = model<IAuthDocument>('Auth', authSchema, 'Auth');
export { AuthModel };
