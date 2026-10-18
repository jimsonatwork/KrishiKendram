import { InventoryTransactionType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateInventoryTransactionDto {
  @IsEnum(InventoryTransactionType) type: InventoryTransactionType;
  @IsNumber() @Min(0.000001) quantity: number;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
