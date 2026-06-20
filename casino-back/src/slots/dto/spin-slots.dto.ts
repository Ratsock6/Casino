import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SpinSlotsDto {
  @IsInt()
  @Min(1)
  bet: number;

  // Machine choisie (défaut : machine classique si absent)
  @IsOptional()
  @IsString()
  machineId?: string;
}
