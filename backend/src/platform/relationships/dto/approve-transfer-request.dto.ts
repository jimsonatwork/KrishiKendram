import { IsOptional, IsString } from 'class-validator';

export class ApproveTransferRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
