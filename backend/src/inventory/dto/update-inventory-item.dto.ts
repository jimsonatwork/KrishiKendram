import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { INVENTORY_CATEGORIES } from './create-inventory-item.dto';

export class UpdateInventoryItemDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsIn(INVENTORY_CATEGORIES) category?: string;
  @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @IsOptional() @IsNumber() @Min(0) reorderLevel?: number;
  @IsOptional() @IsString() @MaxLength(200) supplier?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
