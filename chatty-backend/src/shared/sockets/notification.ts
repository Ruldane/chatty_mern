import { IFollowers } from '@follower/interfaces/follower.interface';
import { Server, Socket } from 'socket.io';

// Define the socketIO notification object as a Server
let socketIONotificationObject: Server;

// Export the SocketIONotificationHandler class and the socketIO notification object
export class SocketIONotificationHandler {
  /**
   * Listens for incoming socket connections and handles incoming events.
   */
  public listen(io: Server): void {
    // Set the socketIO notification object to the provided io Server
    socketIONotificationObject = io;
  }
}

export { socketIONotificationObject };
