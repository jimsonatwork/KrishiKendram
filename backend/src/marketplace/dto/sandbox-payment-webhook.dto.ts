import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SandboxPaymentWebhookDto {
  @IsString() @MinLength(8) @MaxLength(200) @Matches(/^[A-Za-z0-9._:-]+$/)
  eventId: string;

  @IsString() @MaxLength(200) @Matches(/^sandbox_[A-Za-z0-9-]+$/)
  providerPaymentId: string;

  @IsString() @IsIn(['AUTHORIZED', 'CAPTURED', 'FAILED'])
  status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED';

  @IsString() @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  amount: string;

  @IsString() @Matches(/^[A-Z]{3}$/)
  currency: string;
}
