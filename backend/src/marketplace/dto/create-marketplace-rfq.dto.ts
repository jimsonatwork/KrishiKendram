import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min, IsIn } from 'class-validator';
export class CreateMarketplaceRfqDto {
 @IsString() @MaxLength(160) title: string;
 @IsString() @MaxLength(40) category: string;
 @IsString() @MaxLength(4000) description: string;
 @IsNumber() @Min(0.000001) quantity: number;
 @IsString() @MaxLength(40) unit: string;
 @IsOptional() @IsNumber() @Min(0) targetUnitPrice?: number;
 @IsOptional() @IsString() @MaxLength(3) currency?: string;
 @IsOptional() @IsString() @MaxLength(120) deliveryRegion?: string;
 @IsOptional() @IsDateString() neededBy?: string;
}
