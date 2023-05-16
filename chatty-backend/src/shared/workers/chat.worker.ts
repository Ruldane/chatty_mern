import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '@root/config';
import { chatService } from '@service/db/chat.service';

const log: Logger = config.createLogger('authWorker');

class ChatWorker {
  async addChatMessageToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      await chatService.addMessageToDB(job.data);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }

  async markMessageAsDeleted(jobQueue: Job, done: DoneCallback): Promise<void> {
    try {
      const { messageId, type } = jobQueue.data;
      await chatService.markMessageAsDeleted(messageId, type);
      jobQueue.progress(100);
      done(null, jobQueue.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const chatWorker: ChatWorker = new ChatWorker();