import { notificationService } from '@service/db/notification.service';
import { INotificationDocument } from '@notification/interfaces/notification.interface';
import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';

export class Get {
  /**
   * Get notifications from database
   * @param req - Express Request object
   * @param res - Express Response object
   */
  public async notifications(req: Request, res: Response): Promise<void> {
    const notifications: INotificationDocument[] = await notificationService.getNotifications(req.currentUser!.userId);
    res.status(HTTP_STATUS.OK).json({ message: 'Users notification', notifications });
  }
}
