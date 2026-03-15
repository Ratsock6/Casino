import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class AdminWalletActionDto {
  @IsString()
  userId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}