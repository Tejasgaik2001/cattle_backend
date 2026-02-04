import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({
        example: 'farmer@example.com',
        description: 'User email address',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;

    @ApiProperty({
        example: 'SecurePass123',
        description: 'Password (min 8 chars, at least 1 letter and 1 number)',
        minLength: 8,
    })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, {
        message: 'Password must contain at least 1 letter and 1 number',
    })
    password: string;

    @ApiProperty({
        example: 'Rajesh Patil',
        description: 'Full name of the user',
    })
    @IsString()
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    name: string;

    @ApiPropertyOptional({
        example: '+91 9876543210',
        description: 'Phone number',
    })
    @IsOptional()
    @IsString()
    phone?: string;
}
