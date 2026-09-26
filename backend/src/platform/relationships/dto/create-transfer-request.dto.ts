import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransferRequestDto {
  @IsString() resourceType: string;
  @IsString() resourceId: string;
  @IsString() destinationUserId: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsDateString() effectiveAt?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
