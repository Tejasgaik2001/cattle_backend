import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
    IsUUID,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCowDto {
    @ApiProperty({
        example: 'GV-001',
        description: 'Unique tag/ear tag ID for the cow within this farm',
    })
    @IsString()
    @MinLength(1, { message: 'Tag ID is required' })
    tagId: string;

    @ApiPropertyOptional({
        example: 'Lakshmi',
        description: 'Name of the cow (optional)',
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        example: 'female',
        description: 'Gender of the cow',
        enum: ['male', 'female'],
    })
    @IsString()
    @IsIn(['male', 'female'], { message: 'Gender must be male or female' })
    gender: 'male' | 'female';

    @ApiProperty({
        example: 'Gir',
        description: 'Breed of the cow (e.g., Gir, Holstein Friesian, Jersey, Sahiwal)',
    })
    @IsString()
    breed: string;

    @ApiProperty({
        example: '2020-03-15',
        description: 'Date of birth (YYYY-MM-DD format)',
    })
    @IsDateString({}, { message: 'Date of birth must be a valid date (YYYY-MM-DD)' })
    dateOfBirth: string;

    @ApiProperty({
        example: '2020-03-15',
        description: 'Date when the cow was acquired (YYYY-MM-DD format)',
    })
    @IsDateString({}, { message: 'Acquisition date must be a valid date (YYYY-MM-DD)' })
    acquisitionDate: string;

    @ApiPropertyOptional({
        example: 'Born on farm',
        description: 'Source from where the cow was acquired',
    })
    @IsOptional()
    @IsString()
    acquisitionSource?: string;

    @ApiPropertyOptional({
        example: 'uuid-of-mother-cow',
        description: 'UUID of the mother cow (for lineage tracking)',
    })
    @IsOptional()
    @IsUUID('4', { message: 'Mother ID must be a valid UUID' })
    motherId?: string;
}
