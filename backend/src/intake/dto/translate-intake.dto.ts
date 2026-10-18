import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const SUPPORTED_TRANSLATION_LANGUAGES = [
  'te', 'hi', 'ta', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa',
] as const;

export class TranslateIntakeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(6000)
  sourceText: string;

  @IsString()
  @IsIn(SUPPORTED_TRANSLATION_LANGUAGES)
  sourceLanguage: string;
}
