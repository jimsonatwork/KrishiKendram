import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class QuoteOrderDto {
  @IsNumber() @Min(0.000001) quantity: number;
  @IsOptional() @IsNumber() @Min(0) offerPrice?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}(-[A-Z0-9]{1,8})?$/) buyerJurisdictionCode?: string;
}
