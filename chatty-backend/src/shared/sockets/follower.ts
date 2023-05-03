import { IFollowers } from '@follower/interfaces/follower.interface';
import { Server, Socket } from 'socket.io';

export let socketIOFollowerObject: Server;

export class SocketIOFollowerHandler {
  private io: Server;
  constructor(io: Server) {
    this.io = io;
    socketIOFollowerObject = io;
  }

  /**
   * Listens for incoming socket connections and handles incoming events.
   */
  public listen(): void {
    // Set up event listener for new socket connections
    this.io.on('connection', (socket: Socket) => {
      // Set up event listener for 'unfollow user' event
      socket.on('unfollow user', (data: IFollowers) => {
        // Emit 'update like' event to all connected sockets with the reaction data
        this.io.emit('remove follower', data);
      });
    });
  }
}
