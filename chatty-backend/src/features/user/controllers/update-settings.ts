import { joiValidation } from '@global/decorators/joi-validation.decorators';
import { Helpers } from '@global/helpers/helpers';
import { userService } from '@service/db/user.service';
import { UserCache } from '@service/redis/user.cache';
import { ISearchUser } from '@user/interfaces/user.interface';
import { notificationSettingsSchema } from '@user/schemes/info';
import { Request, Response } from 'express';
import HTPP_STATUS from 'http-status-codes';
import { userQueue } from '@service/queus/user.queue';

const userCache: UserCache = new UserCache();

export class UpdateSettings {
  @joiValidation(notificationSettingsSchema)
  public async notification(req: Request, res: Response): Promise<void> {
    await userCache.updateSingleUserItemInCache(`${req.currentUser!.userId}`, 'notifications', req.body);
    userQueue.addUserJob('updateNotificationSettings', { key: `${req.currentUser!.userId}`, value: req.body });
    res.status(HTPP_STATUS.OK).json({ message: 'Notification settings updated successfully', settings: req.body });
  }
}
