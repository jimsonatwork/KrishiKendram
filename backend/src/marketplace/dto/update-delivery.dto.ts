import { IsDateString, IsIn, IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class UpdateDeliveryDto {
  @IsOptional() @IsIn(['PREPARING', 'DISPATCHED', 'IN_TRANSIT', 'FAILED', 'RETURNED']) status?: string;
  @IsOptional() @IsString() @MaxLength(120) carrier?: string;
  @IsOptional() @IsString() @MaxLength(160) trackingNumber?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) @MaxLength(2048) trackingUrl?: string;
  @IsOptional() @IsDateString() estimatedDeliveryAt?: string;
}
