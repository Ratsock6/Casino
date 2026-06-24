import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Historique des derniers messages (au chargement du chat).
  @Get('messages')
  getMessages() {
    return this.chatService.getRecentMessages();
  }
}
