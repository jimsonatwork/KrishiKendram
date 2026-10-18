import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { InputMethod } from '@prisma/client';

const SUPPORTED_ORIGINAL_LANGUAGES = [
  'en', 'te', 'hi', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa',
] as const;

export class CreateIntakeDto {
  @IsString()
  @IsNotEmpty()
  farmId: string;

  @IsEnum(InputMethod)
  inputMethod: InputMethod;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  originalContent?: string;

  @IsOptional()
  @IsString()
  @IsIn(SUPPORTED_ORIGINAL_LANGUAGES)
  originalLanguage?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  englishTranslation?: string;

  @IsOptional()
  @IsBoolean()
  translationConfirmed?: boolean;
}
