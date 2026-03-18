import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    };
  }
}