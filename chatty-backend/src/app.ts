import express, { Express } from 'express';
import { ChattyServer } from '@root/setupServer';
import databaseConnect from '@root/setupDatabase';
import { config } from '@root/config';

class Application {
  public initialize(): void {
    this.loadConfig();
    databaseConnect();
    const app: Express = express();
    const server: ChattyServer = new ChattyServer(app);
    server.start();
  }

  private loadConfig(): void {
    config.validateConfig();
  }
}

const application = new Application();
application.initialize();
