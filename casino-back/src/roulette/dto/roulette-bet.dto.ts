import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { RouletteBetType } from '../types/roulette.types';

const ROULETTE_BET_TYPES: RouletteBetType[] = [
  'STRAIGHT',
  'SPLIT',
  'STREET',
  'CORNER',
  'SIX_LINE',
  'RED',
  'BLACK',
  'EVEN',
  'ODD',
  'LOW',
  'HIGH',
  'DOZEN_1',
  'DOZEN_2',
  'DOZEN_3',
  'COLUMN_1',
  'COLUMN_2',
  'COLUMN_3',
];

export class RouletteBetDto {
  @IsString()
  @IsIn(ROULETTE_BET_TYPES)
  type: RouletteBetType;

  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(36, { each: true })
  numbers?: number[];
}