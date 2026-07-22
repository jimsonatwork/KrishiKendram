import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { InputMethod } from '@prisma/client';

export class RegisterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsOptional()
  @IsEnum(InputMethod)
  preferredInputMethod?: InputMethod;
}