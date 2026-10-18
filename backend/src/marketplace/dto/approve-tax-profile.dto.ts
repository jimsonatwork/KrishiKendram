import { IsString, MaxLength, MinLength } from 'class-validator';

export class ApproveTaxProfileDto {
  @IsString() @MinLength(5) @MaxLength(256)
  reviewReference: string;
}
