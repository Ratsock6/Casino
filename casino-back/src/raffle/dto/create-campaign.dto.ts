import {
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  Min,
  IsISO8601,
  IsIn,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// Un lot d'un tirage
export class CreatePrizeDto {
  @IsIn(['CHIPS', 'VIP', 'CUSTOM'])
  type: 'CHIPS' | 'VIP' | 'CUSTOM';

  @IsString()
  @MaxLength(120)
  label: string;

  // montant (jetons) ou durée VIP ('1_MONTH'...) ; optionnel pour CUSTOM
  @IsOptional()
  @IsString()
  @MaxLength(60)
  value?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  rank?: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

// Un tirage (date + ses lots)
export class CreateDrawDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsISO8601()
  scheduledAt: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePrizeDto)
  prizes: CreatePrizeDto[];
}

// Création complète d'une campagne avec ses tirages et leurs lots
export class CreateCampaignDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(1)
  ticketPrice: number; // en jetons

  @IsInt()
  @Min(1)
  maxTicketsPerUser: number;

  @IsISO8601()
  startsAt: string;

  @IsISO8601()
  endsAt: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDrawDto)
  draws: CreateDrawDto[];
}
