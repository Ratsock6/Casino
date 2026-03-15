import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  IdempotencyRequest,
  IdempotencyStatus,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) { }

  isReplayCompleted(status: IdempotencyStatus, responseBody: unknown): boolean {
    return status === IdempotencyStatus.COMPLETED && responseBody != null;
  }

  isProcessingWithoutResponse(
    status: IdempotencyStatus,
    responseBody: unknown,
  ): boolean {
    return status === IdempotencyStatus.PROCESSING && responseBody == null;
  }

  buildRequestHash(body: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(body ?? {}))
      .digest('hex');
  }

  async begin(
    userId: string,
    route: string,
    key: string,
    requestHash: string,
  ): Promise<{ record: IdempotencyRequest; isNew: boolean }> {
    try {
      const created = await this.prisma.idempotencyRequest.create({
        data: {
          key,
          userId,
          route,
          requestHash,
          status: IdempotencyStatus.PROCESSING,
        },
      });

      return { record: created, isNew: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.idempotencyRequest.findUnique({
          where: { key },
        });

        if (!existing) {
          throw new ConflictException('Idempotency conflict');
        }

        if (existing.userId !== userId || existing.route !== route) {
          throw new ConflictException('Idempotency key already used elsewhere');
        }

        if (existing.requestHash !== requestHash) {
          throw new BadRequestException(
            'Same idempotency key used with a different payload',
          );
        }

        return { record: existing, isNew: false };
      }

      throw error;
    }
  }

  async complete(key: string, responseBody: unknown) {
    return this.prisma.idempotencyRequest.update({
      where: { key },
      data: {
        status: IdempotencyStatus.COMPLETED,
        responseBody: responseBody as Prisma.InputJsonValue,
      },
    });
  }

  async fail(key: string) {
    return this.prisma.idempotencyRequest.update({
      where: { key },
      data: {
        status: IdempotencyStatus.FAILED,
      },
    });
  }
}