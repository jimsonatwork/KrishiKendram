import { FinancialRecordType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateFinancialRecordDto {
  @IsOptional() @IsEnum(FinancialRecordType) type?: FinancialRecordType;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
