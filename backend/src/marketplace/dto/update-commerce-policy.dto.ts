import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateCommercePolicyDto {
  @IsOptional() @IsBoolean() feesEnabled?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) buyerFeePercent?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) sellerCommissionPercent?: number;
  @IsOptional() @IsBoolean() taxEnabled?: boolean;
  @IsOptional() @IsNumber() @Min(0) @Max(100) taxPercent?: number;
  @IsOptional() @IsString() @MaxLength(256) taxReviewReference?: string;
}
