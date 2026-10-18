import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSandboxRefundDto {
  @IsString() @MinLength(8) @MaxLength(128) @Matches(/^[A-Za-z0-9._:-]+$/)
  idempotencyKey: string;

  @IsString() @Matches(/^\\d{1,12}(\\.\\d{1,2})?$/)
  amount: string;

  @IsString() @MinLength(5) @MaxLength(1000)
  reason: string;
}
