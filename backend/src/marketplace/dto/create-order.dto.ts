import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNumber() @Min(0.000001) quantity: number;
  @IsOptional() @IsNumber() @Min(0) offerPrice?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}(-[A-Z0-9]{1,8})?$/) buyerJurisdictionCode?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
