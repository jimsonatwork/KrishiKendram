import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CounterOfferDto {
  @IsNumber() @Min(0) counterOfferPrice: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
