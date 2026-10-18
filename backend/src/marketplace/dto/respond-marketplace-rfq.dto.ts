import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class RespondMarketplaceRfqDto {
 @IsNumber() @Min(0) unitPrice: number;
 @IsNumber() @Min(0.000001) availableQuantity: number;
 @IsOptional() @IsString() @MaxLength(2000) note?: string;
 @IsOptional() @IsDateString() validUntil?: string;
}
