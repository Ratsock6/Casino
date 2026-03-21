import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: { userId: string }) {
    return this.usersService.getMe(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/login-history')
  getMyLoginHistory(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getMyLoginHistory(
      user.userId,
      limit ? parseInt(limit) : 20,
    );
  }
}