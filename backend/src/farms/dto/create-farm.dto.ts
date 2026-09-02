import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';


export class CreateFarmDto {

  @IsString()
  @IsNotEmpty()
  name: string;


  @IsOptional()
  @IsString()
  type?: string;


  @IsOptional()
  @IsString()
  description?: string;


  @IsOptional()
  @IsString()
  location?: string;


  @IsOptional()
  @IsNumber()
  latitude?: number;


  @IsOptional()
  @IsNumber()
  longitude?: number;


  @IsOptional()
  @IsNumber()
  area?: number;


  @IsOptional()
  @IsString()
  unit?: string;

}