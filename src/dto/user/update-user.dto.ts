import { IsString, IsOptional, MinLength, IsIn } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    @IsIn(['en', 'hi', 'mr'], { message: 'Language must be en, hi, or mr' })
    languagePreference?: string;
}
