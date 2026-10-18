import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OrderDecisionDto {
  @IsOptional() @IsNumber() @Min(0) agreedUnitPrice?: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
