import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { PriceTierDto } from './price-tier.dto';
import { IsArray, IsNumber, IsOptional, IsString, IsUrl, Min, MaxLength, ArrayMaxSize, Matches } from 'class-validator';
export class UpdateListingDto {
  @IsOptional() @IsString() @MaxLength(40) category?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @Matches(/^(https?:\/\/[^\s]+|\/uploads\/marketplace\/[A-Za-z0-9._-]+)$/, { each: true }) imageUrls?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(4) @IsString({ each: true }) @Matches(/^(https?:\/\/[^\s]+|\/uploads\/marketplace\/[A-Za-z0-9._-]+)$/, { each: true }) videoUrls?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsUrl({}, { each: true }) externalLinks?: string[];
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsNumber() @Min(0.000001) minOrderQuantity?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => PriceTierDto) priceTiers?: PriceTierDto[];
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}(-[A-Z0-9]{1,8})?$/) sellerJurisdictionCode?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
}
