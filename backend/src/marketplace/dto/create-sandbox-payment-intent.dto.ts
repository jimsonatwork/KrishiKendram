import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSandboxPaymentIntentDto {
  @IsString() @MinLength(8) @MaxLength(128) @Matches(/^[A-Za-z0-9._:-]+$/)
  idempotencyKey: string;
}
