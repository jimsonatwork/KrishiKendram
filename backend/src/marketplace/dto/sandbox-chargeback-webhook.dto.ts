import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SandboxChargebackWebhookDto {
  @IsString() @MinLength(8) @MaxLength(200) @Matches(/^[A-Za-z0-9._:-]+$/)
  eventId: string;

  @IsString() @MaxLength(240) @Matches(/^sandbox_chargeback_[A-Za-z0-9-]+$/)
  providerChargebackId: string;

  @IsString() @IsIn(['WON', 'LOST'])
  status: 'WON' | 'LOST';

  @IsString() @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  amount: string;

  @IsString() @Matches(/^[A-Z]{3}$/)
  currency: string;

  @IsString() @MinLength(5) @MaxLength(1000)
  reason: string;
}
