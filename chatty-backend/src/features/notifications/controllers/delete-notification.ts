import { notificationQueue } from './../../../shared/services/queus/notification.queue';
import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { socketIONotificationObject } from '@socket/notification';

export class Delete {
  /**
   * delete a notification and updates it in the database
   * @param req - Express Request object
   * @param res - Express Response object
   */
  public async notification(req: Request, res: Response): Promise<void> {
    const { notificationId } = req.params;
    socketIONotificationObject.emit('delete notification', notificationId);
    notificationQueue.addNotificationJob('deleteNotification', { key: notificationId });
    res.status(HTTP_STATUS.OK).json({ message: 'Notification deleted successfully' });
  }
}
