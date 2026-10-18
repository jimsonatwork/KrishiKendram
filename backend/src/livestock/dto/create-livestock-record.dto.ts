import { LivestockRecordType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLivestockRecordDto {
  @IsEnum(LivestockRecordType) type: LivestockRecordType;
  @IsString() @MaxLength(1000) description: string;
  @IsOptional() @IsNumber() @Min(0.000001) quantity?: number;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsDateString() recordedAt?: string;
  @IsOptional() @IsDateString() nextDueAt?: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
