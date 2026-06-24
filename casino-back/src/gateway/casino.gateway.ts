import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat/chat.service';

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
    private readonly chatService: ChatService,
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
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.connectedUsers.delete(client.data.userId);
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

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────────────────────────────────

  // Un joueur envoie un message dans le chat global.
  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { content: string },
  ) {
    const userId = client.data.userId;
    const username = client.data.username;
    const role = client.data.role;

    if (!userId) return; // socket non authentifié

    try {
      const message = await this.chatService.createMessage(
        userId,
        username,
        role,
        body?.content,
      );
      // Diffuse le nouveau message à tous les clients connectés
      this.server.emit('chat:message', message);
    } catch (e: any) {
      // Renvoie l'erreur uniquement à l'expéditeur
      client.emit('chat:error', { message: e?.message || 'Erreur lors de l\'envoi' });
    }
  }

  // Un admin supprime un message.
  @SubscribeMessage('chat:delete')
  async handleChatDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { messageId: string },
  ) {
    const role = client.data.role;
    const adminId = client.data.userId;

    // Seuls les admins peuvent supprimer
    if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      client.emit('chat:error', { message: 'Action réservée aux administrateurs' });
      return;
    }

    try {
      await this.chatService.deleteMessage(body?.messageId, adminId);
      // Informe tous les clients que ce message est supprimé
      this.server.emit('chat:deleted', { messageId: body.messageId });
    } catch (e: any) {
      client.emit('chat:error', { message: e?.message || 'Erreur lors de la suppression' });
    }
  }
}