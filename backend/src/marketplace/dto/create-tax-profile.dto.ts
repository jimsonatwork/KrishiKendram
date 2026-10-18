import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateTaxProfileDto {
  @IsString() @Matches(/^[A-Z]{2}(-[A-Z0-9]{1,8})?$/)
  sellerJurisdictionCode: string;

  @IsString() @Matches(/^[A-Z]{2}(-[A-Z0-9]{1,8})?$/)
  buyerJurisdictionCode: string;

  @IsString() @MaxLength(40)
  category: string;

  @IsString() @Matches(/^[A-Z0-9._-]{2,80}$/) @MaxLength(80)
  taxCode: string;

  @IsString() @MaxLength(120)
  taxName: string;

  @IsNumber() @Min(0) @Max(100)
  taxPercent: number;

  @IsString() @IsIn(['SUBTOTAL', 'SUBTOTAL_PLUS_BUYER_FEE', 'BUYER_FEE', 'SELLER_COMMISSION'])
  taxBase: 'SUBTOTAL' | 'SUBTOTAL_PLUS_BUYER_FEE' | 'BUYER_FEE' | 'SELLER_COMMISSION';

  @IsDateString()
  effectiveFrom: string;

  @IsOptional() @IsDateString()
  effectiveTo?: string;

  @IsOptional() @IsString() @MaxLength(256)
  reviewReference?: string;
}
