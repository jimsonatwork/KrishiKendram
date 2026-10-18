import { FinancialRecordType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFinancialRecordDto {
  @IsString() farmId: string;
  @IsEnum(FinancialRecordType) type: FinancialRecordType;
  @IsString() @MaxLength(80) category: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
