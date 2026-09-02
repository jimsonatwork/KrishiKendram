import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

import { InputMethod } from '@prisma/client';


export class CreateFarmRecordDto {


  @IsString()
  category: string;


  @IsOptional()
  @IsString()
  title?: string;


  @IsEnum(InputMethod)
  inputMethod: InputMethod;


  @IsObject()
  data: Record<string, any>;

}