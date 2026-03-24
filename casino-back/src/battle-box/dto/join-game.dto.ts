import { IsOptional, IsString } from 'class-validator';

export class JoinBattleBoxGameDto {
  @IsString()
  gameId: string;

  @IsString()
  @IsOptional()
  inviteCode?: string;
}