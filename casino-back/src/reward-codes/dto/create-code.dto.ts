import { IsString, IsOptional, IsInt, IsDateString, IsEnum, Min } from 'class-validator';

export enum RewardType {
  TOKENS = 'TOKENS',
  VIP    = 'VIP',
  BADGE  = 'BADGE',
  INGAME = 'INGAME',
}

export class CreateRewardCodeDto {
  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RewardType)
  rewardType: RewardType;

  @IsString()
  rewardValue: string; // montant, '1_MONTH', nom badge, description lot RP

  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}