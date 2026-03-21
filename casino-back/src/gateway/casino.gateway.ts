import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'https://casino.ratsock.fr'],
    credentials: true,
  },
})
export class CasinoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map userId -> socketId
  private connectedUsers = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      client.data.userId = payload.sub;
      client.data.username = payload.username;
      client.data.role = payload.role;

      // Rejoindre une room personnelle
      client.join(`user:${payload.sub}`);

      // Rejoindre la room admin si admin
      if (['ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
        client.join('admins');
      }

      this.connectedUsers.set(payload.sub, client.id);
      console.log(`✅ Socket connecté : ${payload.username}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.connectedUsers.delete(client.data.userId);
      console.log(`❌ Socket déconnecté : ${client.data.username}`);
    }
  }

  // Envoie une notification à un joueur spécifique
  notifyUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Envoie une notification à tous les admins
  notifyAdmins(event: string, data: unknown) {
    this.server.to('admins').emit(event, data);
  }

  // Envoie à tout le monde
  broadcast(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}