import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const INVENTORY_CATEGORIES = ['SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'FUEL', 'EQUIPMENT', 'OTHER'] as const;

export class CreateInventoryItemDto {
  @IsString() farmId: string;
  @IsString() @MaxLength(200) name: string;
  @IsIn(INVENTORY_CATEGORIES) category: string;
  @IsString() @MaxLength(40) unit: string;
  @IsOptional() @IsNumber() @Min(0) initialQuantity?: number;
  @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @IsOptional() @IsString() @MaxLength(200) supplier?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
