import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RewardCodesService } from './reward-codes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateRewardCodeDto } from './dto/create-code.dto';

@Controller('reward-codes')
@UseGuards(JwtAuthGuard)
export class RewardCodesController {
  constructor(private readonly rewardCodesService: RewardCodesService) {}

  // ─── Admin ────────────────────────────────────────────────────────────────
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAllCodes() {
    return this.rewardCodesService.getAllCodes();
  }

  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createCode(
    @CurrentUser() admin: { userId: string },
    @Body() dto: CreateRewardCodeDto,
  ) {
    return this.rewardCodesService.createCode(admin.userId, dto);
  }

  @Patch('admin/:codeId/toggle')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  toggleCode(@Param('codeId') codeId: string) {
    return this.rewardCodesService.toggleCode(codeId);
  }

  @Delete('admin/:codeId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteCode(@Param('codeId') codeId: string) {
    return this.rewardCodesService.deleteCode(codeId);
  }

  // ─── Joueur ───────────────────────────────────────────────────────────────
  @Post('use')
  useCode(
    @CurrentUser() user: { userId: string },
    @Body('code') code: string,
  ) {
    return this.rewardCodesService.useCode(user.userId, code);
  }
}