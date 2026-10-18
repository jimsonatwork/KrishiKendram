import { IsBoolean, IsString, MaxLength } from 'class-validator';
export class UpdateFeatureFlagDto {
  @IsBoolean() enabled: boolean;
  @IsString() @MaxLength(1000) reason: string;
}
