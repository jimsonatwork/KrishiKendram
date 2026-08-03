import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { CropSeason, CropStatus } from '@prisma/client';

export class CreateCropDto {
  @IsString()
  farmId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  variety?: string;

  @IsEnum(CropSeason)
  season: CropSeason;

  @IsOptional()
  @IsEnum(CropStatus)
  status?: CropStatus;

  @IsOptional()
  @IsDateString()
  sowingDate?: string;

  @IsOptional()
  @IsDateString()
  harvestDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}