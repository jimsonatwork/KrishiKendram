import {
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';

import { InputMethod } from '@prisma/client';

export class CreateIntakeDto {

  @IsString()
  @IsNotEmpty()
  farmId: string;

  @IsEnum(InputMethod)
  inputMethod: InputMethod;

  @IsString()
  @IsNotEmpty()
  content: string;
}
