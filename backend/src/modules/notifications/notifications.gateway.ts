import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: process.env.APP_URL || 'http://localhost:3000', credentials: true },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // userId → Set of socket IDs (user can have multiple tabs)
  private userSockets = new Map<string, Set<string>>();

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }
      const payload: any = this.jwt.verify(token);
      const userId  = payload.sub;
      const orgId   = payload.orgId;
      client.data.userId = userId;
      client.data.orgId  = orgId;
      client.data.role   = payload.role;

      // Join personal room + org room
      client.join(`user:${userId}`);
      client.join(`org:${orgId}`);
      if (['SUPER_ADMIN','ADMIN','HR'].includes(payload.role)) {
        client.join(`admin:${orgId}`);
      }

      // Track sockets per user
      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
      this.userSockets.get(userId)!.add(client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) this.userSockets.delete(userId);
    }
  }

  // Send to a specific user
  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  // Send to all admins/HR in an org
  sendToAdmins(orgId: string, notification: any) {
    this.server.to(`admin:${orgId}`).emit('notification', notification);
  }

  // Send to everyone in an org
  sendToOrg(orgId: string, notification: any) {
    this.server.to(`org:${orgId}`).emit('notification', notification);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }
}
