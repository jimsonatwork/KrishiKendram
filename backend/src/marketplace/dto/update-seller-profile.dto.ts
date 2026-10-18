import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
export class UpdateSellerProfileDto {
 @IsOptional() @IsString() @MaxLength(100) displayName?: string;
 @IsOptional() @IsString() @MaxLength(2000) bio?: string;
 @IsOptional() @IsString() @MaxLength(120) regionLabel?: string;
 @IsOptional() @IsIn(['IN_APP','PHONE','WHATSAPP']) contactPreference?: string;
 @IsOptional() @IsString() @MaxLength(30) @Matches(/^[+0-9 ()-]*$/) publicPhone?: string;
 @IsOptional() @IsBoolean() showPhone?: boolean;
}
