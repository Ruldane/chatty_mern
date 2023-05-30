import express, { Express } from 'express';
import { ChattyServer } from '@root/setupServer';
import databaseConnect from '@root/setupDatabase';
import { config } from '@root/config';
import Logger from 'bunyan';

const log: Logger = config.createLogger('app');

class Application {
  public initialize(): void {
    this.loadConfig();
    databaseConnect();
    const app: Express = express();
    const server: ChattyServer = new ChattyServer(app);
    server.start();
    Application.handleExit();
  }

  private loadConfig(): void {
    config.validateConfig();
    config.cloudinaryConfig();
  }

  private static handleExit(): void {
    process.on('uncaughtException', (error: Error) => {
      log.error(`There was an uncaught exception: ${error}`);
      Application.shutdownProperly(1);
    });

    process.on('unhandleRejection', (reaseon: Error) => {
      log.error(`unhandleRejection at Promise: ${reaseon}`);
      Application.shutdownProperly(2);
    });

    process.on('SIGTERM', () => {
      log.error('CAUGHT SIGTERM received');
      Application.shutdownProperly(2);
    });

    process.on('exit', () => {
      log.error('Exiting...');
    });
  }
  private static shutdownProperly(exitCode: number): void {
    Promise.resolve()
      .then(() => {
        log.info('Shutting down...');
        process.exit(exitCode);
      })
      .catch((error: Error) => {
        log.error('error during shutown: ', error);
        process.exit(1);
      });
  }
}

const application = new Application();
application.initialize();
