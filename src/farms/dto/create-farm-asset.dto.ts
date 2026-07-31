import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';


export class CreateFarmAssetDto {


  @IsString()
  type: string;


  @IsOptional()
  @IsString()
  name?: string;


  @IsOptional()
  @IsNumber()
  quantity?: number;


  @IsOptional()
  @IsString()
  unit?: string;


  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

}