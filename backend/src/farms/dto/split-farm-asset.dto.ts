import { IsDateString, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class SplitFarmAssetDto {
  @IsNumber()
  @Min(0.000001)
  quantity: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
