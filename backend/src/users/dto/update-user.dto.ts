import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  MinLength,
} from 'class-validator'

import {
  InputMethod,
  UserRole,
  UserStatus,
} from '@prisma/client'

// ============================================================
// PART 01 - IMPORTS
// ============================================================

// Imports are kept above the DTO definition.

// ============================================================
// PART 01 END
// ============================================================


// ============================================================
// PART 02 - UPDATE USER DTO
// ============================================================

export class UpdateUserDto {
  // Basic identity fields
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  mobile?: string

  // Password is accepted only as a new password.
  // Existing password is never returned by the API.
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string

  // Access and account state
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus

  // User preferences
  @IsOptional()
  @IsString()
  preferredLanguage?: string

  @IsOptional()
  @IsEnum(InputMethod)
  preferredInputMethod?: InputMethod

  // Profile state
  @IsOptional()
  @IsInt()
  @Min(0)
  profileCompletion?: number

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean
}

// ============================================================
// PART 02 END
// ============================================================