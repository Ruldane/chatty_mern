import { notificationQueue } from './../../../shared/services/queus/notification.queue';
import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { socketIONotificationObject } from '@socket/notification';

export class Update {
  /**
   * Marks a notification as read and updates it in the database
   * @param req - Express Request object
   * @param res - Express Response object
   */
  public async notification(req: Request, res: Response): Promise<void> {
    const { notificationId } = req.params;
    socketIONotificationObject.emit('update notification', notificationId);
    notificationQueue.addNotificationJob('updateNotification', { key: notificationId });
    res.status(HTTP_STATUS.OK).json({ message: 'Notification marked as read' });
  }
}
