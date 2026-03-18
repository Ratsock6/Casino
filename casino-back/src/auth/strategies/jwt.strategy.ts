import { Injectable, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, status: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.status === 'BANNED') {
      throw new ForbiddenException('Your account has been banned');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException('Your account is suspended');
    }

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
  }
}