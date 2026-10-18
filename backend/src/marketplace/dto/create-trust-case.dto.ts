import { IsArray, IsIn, IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';
export class CreateTrustCaseDto {
  @IsIn(['REPORT', 'DISPUTE', 'APPEAL']) type: 'REPORT' | 'DISPUTE' | 'APPEAL' = 'REPORT';
  @IsIn(['FRAUD', 'MISREPRESENTATION', 'NON_DELIVERY', 'QUALITY', 'HARASSMENT', 'PAYMENT_DISPUTE', 'SAFETY', 'OTHER']) category: string;
  @IsString() @MaxLength(4000) description: string;
  @IsOptional() @IsString() appealOfCaseId?: string;
  @IsOptional() @IsString() listingId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) evidenceUrls?: string[];
}
