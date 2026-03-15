import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { RouletteBetDto } from './roulette-bet.dto';

export class PlaceRouletteBetsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RouletteBetDto)
  bets: RouletteBetDto[];
}