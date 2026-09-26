import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class TransferResourceDto {
  @IsString()
  destinationUserId: string;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  evidenceReferenceType?: string;

  @IsOptional()
  @IsString()
  evidenceReferenceValue?: string;

  @IsOptional()
  @IsString()
  evidenceDocumentNumber?: string;

  @IsOptional()
  @IsString()
  evidenceIssuer?: string;
}