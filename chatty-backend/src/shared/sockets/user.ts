import { ILogin, ISocketData } from '@user/interfaces/user.interface';
import { Server, Socket } from 'socket.io';

export let socketIOUserObject: Server;

// get all connected users and send it to the client using socketIO
export const connectedUsersMap: Map<string, string> = new Map();
let users: string[] = [];

export class SocketIOUserHandler {
  private io: Server;
  constructor(io: Server) {
    this.io = io;
    socketIOUserObject = io;
  }

  /**
   * Listens for incoming socket connections and handles incoming events.
   */
  public listen(): void {
    this.io.on('connection', (socket: Socket) => {
      socket.on('setup', (data: ILogin) => {
        this.addClientToMap(data.userId, socket.id);
        this.addUser(data.userId);
        this.io.emit('user online', users);
      });
      socket.on('block user', (data: ISocketData) => {
        this.io.emit('blocked user id', data);
      });
      socket.on('unblock user', (data: ISocketData) => {
        this.io.emit('unblocked user id', data);
      });
      socket.on('disconnect', () => {
        this.removeClientFromMap(socket.id);
      });
    });
  }
  /**
   * Adds a client to the connected users map if it doesn't already exist.
   *
   * @param username - The username of the client.
   * @param socketId - The ID of the socket connection.
   */
  private addClientToMap(username: string, socketId: string): void {
    // If the username is not already in the map, add it.
    if (!connectedUsersMap.has(username)) {
      connectedUsersMap.set(username, socketId);
    }
  }

  /**
   * Remove a client from the map of connected users.
   * @param socketId The ID of the client's socket connection.
   */
  private removeClientFromMap(socketId: string): void {
    // Check if the socket ID is in the list of connected users
    if (Array.from(connectedUsersMap.values()).includes(socketId)) {
      // Find the user in the map with the matching socket ID
      const disconnectedUser: [string, string] = [...connectedUsersMap].find((user: [string, string]) => {
        return user[1] === socketId;
      }) as [string, string];
      // Remove the user from the map
      connectedUsersMap.delete(disconnectedUser[0]);
      this.removeUser(disconnectedUser[0]);
      // Use socket to send users connected
      this.io.emit('user online', users);
    }
  }
  private addUser(username: string): void {
    users.push(username);
    users = [...new Set(users)];
  }

  /**
   * Removes a user from the list of users.
   * @param {string} username - The username of the user to remove.
   * @returns {void}
   */
  private removeUser(username: string): void {
    // Filter the list of users and keep only the users whose name is not equal to the given username.
    users = users.filter((name: string) => name !== username);
  }
}
