import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMarketplaceListingQuestionDto {
  @IsString() @MinLength(5) @MaxLength(2000) question: string;
  @IsOptional() @IsString() @IsIn(['PRODUCT_QUESTION', 'SAMPLE_REQUEST', 'BULK_ORDER', 'OTHER']) questionType?: string;
}
