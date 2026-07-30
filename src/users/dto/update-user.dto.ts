import {
  IsEnum,
  IsOptional,
} from 'class-validator';

import { UserRole, UserStatus } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
