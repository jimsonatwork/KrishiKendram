import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransferRequestDto {
  @IsString() @IsNotEmpty() resourceType: string;
  @IsString() @IsNotEmpty() resourceId: string;
  @IsString() @IsNotEmpty() destinationUserId: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsDateString() effectiveAt?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() evidenceReferenceType?: string;
  @IsOptional() @IsString() evidenceReferenceValue?: string;
  @IsOptional() @IsString() evidenceDocumentNumber?: string;
  @IsOptional() @IsString() evidenceIssuer?: string;
}
