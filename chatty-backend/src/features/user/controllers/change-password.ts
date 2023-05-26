import { Request, Response } from 'express';
import HTPP_STATUS from 'http-status-codes';
import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { changePasswordSchema } from '@user/schemes/info';
import { BadRequestError } from '@global/helpers/error-handler';
import { authService } from '@service/db/auth.service';
import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { userService } from '@service/db/user.service';
import moment from 'moment';
import publicIP from 'ip';
import { IResetPasswordParams } from '@user/interfaces/user.interface';
import { resetPasswordTemplate } from '@service/emails/templates/reset-password/reset-password-template';
import { emailQueue } from '@service/queus/email.queue';

export class Update {
  @joiValidation(changePasswordSchema)
  public async password(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }
    const existingUser: IAuthDocument = await authService.getAuthUserByUsername(req.currentUser!.username);
    const passwordMatch = await existingUser.comparePassword(currentPassword);
    if (!passwordMatch) {
      throw new BadRequestError('Invalid credentials');
    }
    const hashPassword = await existingUser.hashPassword(newPassword);
    await userService.updatePassword(`${req.currentUser!.username}`, hashPassword);
    const templateParams: IResetPasswordParams = {
      username: existingUser.username,
      email: existingUser.email,
      ipaddress: publicIP.address(),
      date: moment().format('DD/MM/YYYY: HH:mm')
    };
    const template: string = resetPasswordTemplate.passwordResetConfirmationTemplate(templateParams);
    emailQueue.addEmailJob('changePassword', { template, receiverEmail: existingUser.email, subject: 'Password update Confirmation' });
    res.status(HTPP_STATUS.OK).json({ message: 'Password Updated. You will be redirected shortly to the login' });
  }
}
