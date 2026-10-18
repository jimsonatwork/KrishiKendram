import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class ResolveTrustCaseDto {
  @IsIn(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']) status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  @IsString() @MaxLength(4000) resolution: string;
  @IsOptional() @IsString() restrictionUserId?: string;
  @IsOptional() @IsIn(['CAUTION', 'LISTING_CREATE', 'ORDER_CREATE', 'MARKETPLACE_ALL']) restrictionScope?: string;
  @IsOptional() @IsInt() @Min(1) @Max(365) restrictionDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) cautionRating?: number;
}
