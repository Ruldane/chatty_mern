import { notificationWorker } from './../../workers/notification.worker';
import { INotificationJobData } from './../../../features/notifications/interfaces/notification.interface';
import { BaseQueue } from './base.queue';

class NotificationQueue extends BaseQueue {
  constructor() {
    super('notifications');
    this.processJob('deleteNotification', 5, notificationWorker.deleteNotification);
    this.processJob('updateNotification', 5, notificationWorker.updateNotification);
  }

  public addNotificationJob(name: string, data: INotificationJobData): void {
    this.addJob(name, data);
  }
}

export const notificationQueue: NotificationQueue = new NotificationQueue();
