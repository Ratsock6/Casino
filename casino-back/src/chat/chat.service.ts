import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Nombre de messages conservés en base (les plus anciens sont supprimés au-delà).
const MAX_MESSAGES = 100;
// Longueur maximale d'un message.
const MAX_LENGTH = 300;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // Récupère les derniers messages non supprimés (ordre chronologique).
  async getRecentMessages(limit = MAX_MESSAGES) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse().map((m) => this.format(m));
  }

  // Crée un message, puis purge les anciens au-delà de MAX_MESSAGES.
  async createMessage(
    userId: string,
    username: string,
    role: string,
    rawContent: string,
  ) {
    const content = (rawContent ?? '').trim();
    if (!content) throw new BadRequestException('Message vide');
    if (content.length > MAX_LENGTH) {
      throw new BadRequestException(`Message trop long (max ${MAX_LENGTH} caractères)`);
    }

    const message = await this.prisma.chatMessage.create({
      data: { userId, username, role, content },
    });

    // Purge : conserve uniquement les MAX_MESSAGES plus récents (non supprimés).
    await this.pruneOldMessages();

    return this.format(message);
  }

  // Supprime (soft delete) un message — action admin.
  async deleteMessage(messageId: string, adminId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message introuvable');

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deleted: true, deletedBy: adminId },
    });

    return { id: messageId, deleted: true };
  }

  // Garde seulement les MAX_MESSAGES messages non supprimés les plus récents.
  private async pruneOldMessages() {
    const count = await this.prisma.chatMessage.count({ where: { deleted: false } });
    if (count <= MAX_MESSAGES) return;

    const toDelete = count - MAX_MESSAGES;
    const oldest = await this.prisma.chatMessage.findMany({
      where: { deleted: false },
      orderBy: { createdAt: 'asc' },
      take: toDelete,
      select: { id: true },
    });

    await this.prisma.chatMessage.deleteMany({
      where: { id: { in: oldest.map((m) => m.id) } },
    });
  }

  private format(m: {
    id: string;
    userId: string;
    username: string;
    role: string;
    content: string;
    createdAt: Date;
  }) {
    return {
      id: m.id,
      userId: m.userId,
      username: m.username,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    };
  }
}
