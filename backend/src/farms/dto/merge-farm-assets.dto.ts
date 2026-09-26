import { ArrayMinSize, IsArray, IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class MergeFarmAssetsDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  sourceAssetIds: string[];

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
