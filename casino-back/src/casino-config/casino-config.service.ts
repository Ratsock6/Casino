import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CasinoConfigService {
  constructor(private readonly prisma: PrismaService) { }

  async get(key: string): Promise<string | null> {
    const config = await this.prisma.casinoConfig.findUnique({
      where: { key },
    });
    return config?.value ?? null;
  }

  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return defaultValue;
    return value === 'true';
  }

  async set(key: string, value: string, adminId?: string): Promise<void> {
    await this.prisma.casinoConfig.upsert({
      where: { key },
      update: { value, updatedBy: adminId },
      create: { key, value, updatedBy: adminId },
    });
  }

  async getAll() {
    const configs = await this.prisma.casinoConfig.findMany({
      where: {
        key: {
          not: { startsWith: 'DISCORD_LINK_' },
        },
      },
      orderBy: { key: 'asc' },
    });

    return Promise.all(
      configs.map(async (config) => {
        let updatedByUsername: string | null = null;
        if (config.updatedBy) {
          const user = await this.prisma.user.findUnique({
            where: { id: config.updatedBy },
            select: { username: true },
          });
          updatedByUsername = user?.username ?? null;
        }
        return {
          ...config,
          updatedByUsername,
        };
      })
    );
  }
}
