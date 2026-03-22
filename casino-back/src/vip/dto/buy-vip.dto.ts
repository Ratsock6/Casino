import { IsEnum } from 'class-validator';

export enum VipDuration {
  ONE_MONTH   = '1_MONTH',
  THREE_MONTHS = '3_MONTHS',
  SIX_MONTHS  = '6_MONTHS',
  LIFETIME    = 'LIFETIME',
}

export class BuyVipDto {
  @IsEnum(VipDuration)
  duration: VipDuration;
}
