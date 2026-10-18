import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class NotificationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @IsIn(['INFO', 'SUCCESS', 'WARNING', 'CRITICAL'])
  severity?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  unreadOnly?: string;

  @IsOptional()
  @Matches(/^[0-9]{1,3}$/)
  limit?: string;
}
