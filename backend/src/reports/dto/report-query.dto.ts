import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  farmId?: string;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'fromDate must use YYYY-MM-DD format.' })
  fromDate?: string;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'toDate must use YYYY-MM-DD format.' })
  toDate?: string;
}
