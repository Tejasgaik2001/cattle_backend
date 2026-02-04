import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
    IsUUID,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCowDto {
    @ApiPropertyOptional({
        example: 'GV-001',
        description: 'Unique tag ID for the cow',
    })
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Tag ID cannot be empty' })
    tagId?: string;

    @ApiPropertyOptional({
        example: 'Lakshmi',
        description: 'Name of the cow',
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({
        example: 'female',
        description: 'Gender of the cow',
        enum: ['male', 'female'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['male', 'female'], { message: 'Gender must be male or female' })
    gender?: 'male' | 'female';

    @ApiPropertyOptional({
        example: 'Gir',
        description: 'Breed of the cow',
    })
    @IsOptional()
    @IsString()
    breed?: string;

    @ApiPropertyOptional({
        example: '2020-03-15',
        description: 'Date of birth (YYYY-MM-DD format)',
    })
    @IsOptional()
    @IsDateString({}, { message: 'Date of birth must be a valid date (YYYY-MM-DD)' })
    dateOfBirth?: string;

    @ApiPropertyOptional({
        example: '2020-03-15',
        description: 'Acquisition date (YYYY-MM-DD format)',
    })
    @IsOptional()
    @IsDateString({}, { message: 'Acquisition date must be a valid date (YYYY-MM-DD)' })
    acquisitionDate?: string;

    @ApiPropertyOptional({
        example: 'Purchased from local market',
        description: 'Source of acquisition',
    })
    @IsOptional()
    @IsString()
    acquisitionSource?: string;

    @ApiPropertyOptional({
        example: 'uuid-of-mother-cow',
        description: 'UUID of the mother cow',
    })
    @IsOptional()
    @IsUUID('4', { message: 'Mother ID must be a valid UUID' })
    motherId?: string;
}

export class UpdateLifecycleStatusDto {
    @ApiProperty({
        example: 'sold',
        description: 'New lifecycle status for the cow',
        enum: ['active', 'sold', 'deceased'],
    })
    @IsString()
    @IsIn(['active', 'sold', 'deceased'], { message: 'Status must be active, sold, or deceased' })
    lifecycleStatus: 'active' | 'sold' | 'deceased';
}
