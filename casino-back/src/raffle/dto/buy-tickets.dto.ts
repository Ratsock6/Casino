import { IsInt, Min, Max } from 'class-validator';

export class BuyTicketsDto {
  @IsInt()
  @Min(1)
  @Max(1000) // garde-fou : on ne peut pas acheter plus de 1000 tickets en un appel
  quantity: number;
}
