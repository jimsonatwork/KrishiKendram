import { IsIn, IsString, MaxLength } from 'class-validator';
export class DecideMarketplaceRfqResponseDto {
 @IsString() @IsIn(['ACCEPTED','REJECTED']) status: 'ACCEPTED'|'REJECTED';
 @IsString() @MaxLength(1000) reason: string;
}
