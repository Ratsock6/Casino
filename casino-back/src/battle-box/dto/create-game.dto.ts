import { IsBoolean, IsInt, IsObject, IsOptional, Min, Max } from 'class-validator';

export class CreateBattleBoxGameDto {
  @IsObject()
  boxSelection: Record<string, number>; // { STANDARD: 2, PREMIUM: 1 }

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;

  @IsInt()
  @IsOptional()
  @Min(2)
  @Max(4)
  maxPlayers?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(2)
  teamSize?: number;
}