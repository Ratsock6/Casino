import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      birthDate: user.birthDate,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      balance: user.wallet?.balance.toString() ?? '0',
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
    };
  }

  async getMyLoginHistory(userId: string, limit = 20) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });
  }


  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Vérifie l'ancien mot de passe
    const isValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!isValid) {
      throw new BadRequestException('Mot de passe actuel incorrect.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Mot de passe modifié avec succès.' };
  }
}