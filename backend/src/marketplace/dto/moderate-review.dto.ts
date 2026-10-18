import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReviewDto {
  @IsIn(['PUBLISHED', 'REJECTED', 'HIDDEN']) status: 'PUBLISHED' | 'REJECTED' | 'HIDDEN';
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
