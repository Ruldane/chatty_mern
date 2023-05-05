import { Request, Response } from 'express';
import { config } from '@root/config';
import HTTP_STATUS from 'http-status-codes';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { emailSchema, passwordSchema } from '@auth/schemes/password';
import { authService } from '@service/db/auth.service';
import { IAuthDocument } from '../interfaces/auth.interface';
import { BadRequestError } from '@global/helpers/error-handler';
import crypto from 'crypto';
import { forgotPasswordTemplate } from '@service/emails/templates/forgot-password/forgot-password-template';
import { emailQueue } from '@service/queus/email.queue';
import { IResetPasswordParams } from '../../user/interfaces/user.interface';
import moment from 'moment';
import publicIP from 'ip';
import { resetPasswordTemplate } from '@service/emails/templates/reset-password/reset-password-template';

export class Password {
  @joiValidation(emailSchema)
  public async create(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    const existingUser: IAuthDocument = await authService.getAuthUserByEmail(email);
    if (!existingUser) {
      throw new BadRequestError('Invalid credentials');
    }
    // Generate a random buffer
    const randomBytes: Buffer = await Promise.resolve(crypto.randomBytes(20));
    // generate a hex string from the buffer
    const randomCharacters: string = randomBytes.toString('hex');
    // token will be valid for one hour
    await authService.updatePasswordToken(`${existingUser._id}`, randomCharacters, Date.now() * 60 * 60 * 1000);
    const resetLink = `${config.CLIENT_URL}/reset-password?token=${randomCharacters}`;
    const template: string = forgotPasswordTemplate.passwordResetTemplate(existingUser.username, resetLink);
    emailQueue.addEmailJob('forgotPassword', { template, receiverEmail: email, subject: 'Reset your password' });
    res.status(HTTP_STATUS.OK).json({ message: 'Password reset link sent to your email' });
  }

  @joiValidation(passwordSchema)
  public async update(req: Request, res: Response): Promise<void> {
    const { password, confirmPassword } = req.body;
    const { token } = req.params;
    if (password !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }
    const existingUser: IAuthDocument = await authService.getAuthUserByPasswordToken(token);
    if (!existingUser) {
      throw new BadRequestError('Reset token has expired.');
    }
    existingUser.password = password;
    // remove the token and expiry time if the password is good
    existingUser.passwordResetExpires = undefined;
    existingUser.passwordResetToken = undefined;
    // save the user inside MongoDB
    await existingUser.save();
    const templateParams: IResetPasswordParams = {
      username: existingUser.username,
      email: existingUser.email,
      ipaddress: publicIP.address(),
      date: moment().format('DD/MM/YYYY: HH:mm')
    };
    const template: string = resetPasswordTemplate.passwordResetConfirmationTemplate(templateParams);
    emailQueue.addEmailJob('forgotPassword', { template, receiverEmail: existingUser.email, subject: 'Password Reset Confirmation' });
    res.status(HTTP_STATUS.OK).json({ message: 'Password successfully updated.' });
  }
}
