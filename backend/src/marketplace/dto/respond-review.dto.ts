import { IsString, MaxLength } from 'class-validator';
export class RespondReviewDto { @IsString() @MaxLength(2000) response: string; }
