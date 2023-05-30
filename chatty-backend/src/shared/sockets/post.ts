import { ICommentDocument } from '@comment/interfaces/comment.interface';
import { IReactionDocument } from '@reaction/interfaces/reaction.interface';
import { Server, Socket } from 'socket.io';

export let socketIOPostObject: Server;

export class SocketIOPostHandler {
  private io: Server;
  constructor(io: Server) {
    this.io = io;
    socketIOPostObject = io;
  }

  /**
   * Listens for incoming socket connections and handles incoming events.
   */
  public listen(): void {
    // Set up event listener for new socket connections
    this.io.on('connection', (socket: Socket) => {
      // Set up event listener for 'reaction' event
      socket.on('reaction', (reaction: IReactionDocument) => {
        // Emit 'update like' event to all connected sockets with the reaction data
        this.io.emit('update like', reaction);
      });
      // Set up event listener for 'comment' event
      socket.on('comment', (data: ICommentDocument) => {
        // Emit 'update comment' event to all connected sockets with the comment data
        this.io.emit('update comment', data);
      });
    });
  }
}
