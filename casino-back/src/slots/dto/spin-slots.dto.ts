import { IsInt, Min } from 'class-validator';

export class SpinSlotsDto {
  @IsInt()
  @Min(1)
  bet: number;
}