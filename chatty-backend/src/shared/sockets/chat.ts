import { ISenderReceiver } from './../../features/chat/interfaces/chat.interface';
import { IFollowers } from '@follower/interfaces/follower.interface';
import { Server, Socket } from 'socket.io';

export let socketIOChatObject: Server;

export class SocketIoChatHandler {
  private io: Server;
  constructor(io: Server) {
    this.io = io;
    socketIOChatObject = io;
  }

  public listen(): void {
    this.io.on('connection', (socket: Socket) => {
      socket.on('join room', (data: ISenderReceiver) => {
        console.log(data);
      });
    });
  }
}
