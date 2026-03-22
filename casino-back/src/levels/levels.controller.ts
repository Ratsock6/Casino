import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LevelsService } from './levels.service';

@Controller('levels')
@UseGuards(JwtAuthGuard)
export class LevelsController {
    constructor(private readonly levelsService: LevelsService) { }

    @Get('me')
    getMyLevel(@CurrentUser() user: { userId: string }) {
        return this.levelsService.getMyLevel(user.userId);
    }

    @Get('leaderboard')
    getLeaderboard() {
        return this.levelsService.getLeaderboard();
    }

    @Get('rewards')
    getRewardsTable() {
        return this.levelsService.getRewardsTable();
    }

    @Get('admin/ingame')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    getAllIngameRewards() {
        return this.levelsService.getAllIngameRewards();
    }

    @Get('admin/ingame/pending')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    getPendingIngameRewards() {
        return this.levelsService.getPendingIngameRewards();
    }

    @Patch('admin/ingame/:rewardId/claim')
    @UseGuards(RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    claimIngameReward(
        @Param('rewardId') rewardId: string,
        @CurrentUser() admin: { userId: string },
    ) {
        return this.levelsService.claimIngameReward(rewardId, admin.userId);
    }
}