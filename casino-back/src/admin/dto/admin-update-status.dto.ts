import { IsEnum } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  SUSPENDED = 'SUSPENDED',
}

export class AdminUpdateStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}