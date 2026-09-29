import { IsIn, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateListingDto {
  @IsIn(['farmAsset', 'crop', 'livestock']) resourceType: string;
  @IsString() resourceId: string;
  @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsString() currency?: string;
}