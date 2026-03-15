import { IsInt, Min } from 'class-validator';

export class StartBlackjackDto {
  @IsInt()
  @Min(1)
  bet: number;
}