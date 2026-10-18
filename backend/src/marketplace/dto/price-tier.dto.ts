import { IsNumber, Min } from 'class-validator';

export class PriceTierDto {
  @IsNumber() @Min(0.000001) minQuantity: number;
  @IsNumber() @Min(0) unitPrice: number;
}
