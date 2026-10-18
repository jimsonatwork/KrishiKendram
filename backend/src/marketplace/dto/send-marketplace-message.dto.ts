import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class SendMarketplaceMessageDto {
 @IsString() @MinLength(1) @MaxLength(128) recipientId: string;
 @IsOptional() @IsString() @MaxLength(128) listingId?: string;
 @IsOptional() @IsString() @MaxLength(128) orderId?: string;
 @IsString() @MinLength(1) @MaxLength(4000) body: string;
}
