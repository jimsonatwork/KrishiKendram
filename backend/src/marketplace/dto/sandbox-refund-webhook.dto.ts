import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SandboxRefundWebhookDto {
  @IsString() @MinLength(8) @MaxLength(200) @Matches(/^[A-Za-z0-9._:-]+$/)
  eventId: string;

  @IsString() @MaxLength(220) @Matches(/^sandbox_refund_[A-Za-z0-9-]+$/)
  providerRefundId: string;

  @IsString() @IsIn(['SUCCEEDED', 'FAILED'])
  status: 'SUCCEEDED' | 'FAILED';

  @IsString() @Matches(/^\\d{1,12}(\\.\\d{1,2})?$/)
  amount: string;

  @IsString() @Matches(/^[A-Z]{3}$/)
  currency: string;
}
