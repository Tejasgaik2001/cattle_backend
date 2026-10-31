import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
    IsUUID,
    MinLength,
    IsNumber,
    IsBoolean,
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
        example: 25000,
        description: 'Cost of acquisition (if purchased)',
    })
    @IsOptional()
    @IsNumber()
    acquisitionCost?: number;

    @ApiPropertyOptional({
        example: 'uuid-of-mother-cow',
        description: 'UUID of the mother cow',
    })
    @IsOptional()
    @IsUUID('4', { message: 'Mother ID must be a valid UUID' })
    motherId?: string;

    @ApiPropertyOptional({
        example: 'uuid-of-sire-cow',
        description: 'UUID of the on-farm sire bull',
    })
    @IsOptional()
    @IsUUID('4', { message: 'Sire ID must be a valid UUID' })
    sireId?: string;

    @ApiPropertyOptional({
        example: 'uuid-of-external-bull',
        description: 'UUID of the external bull',
    })
    @IsOptional()
    @IsUUID('4', { message: 'External Sire ID must be a valid UUID' })
    externalSireId?: string;

    @ApiPropertyOptional({
        example: 'NATURAL',
        description: 'Breeding method used (NATURAL or AI)',
        enum: ['NATURAL', 'AI'],
    })
    @IsOptional()
    @IsIn(['NATURAL', 'AI'], { message: 'Breeding method must be NATURAL or AI' })
    breedingMethod?: 'NATURAL' | 'AI';

    @ApiPropertyOptional({
        example: true,
        description: 'Whether the calf was born on this farm or purchased',
    })
    @IsOptional()
    @IsBoolean()
    bornOnFarm?: boolean;
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

    // Sale information (required when status is 'sold')
    @ApiPropertyOptional({
        example: 'Ramesh Kumar',
        description: 'Name of the buyer (required when selling)',
    })
    @IsOptional()
    @IsString()
    soldTo?: string;

    @ApiPropertyOptional({
        example: 45000,
        description: 'Sale price in local currency (required when selling)',
    })
    @IsOptional()
    @IsNumber()
    soldPrice?: number;

    @ApiPropertyOptional({
        example: '2024-05-23',
        description: 'Date of sale (required when selling)',
    })
    @IsOptional()
    @IsDateString({}, { message: 'Sale date must be a valid date (YYYY-MM-DD)' })
    soldDate?: string;

    @ApiPropertyOptional({
        example: 'Sold for breeding purposes',
        description: 'Additional notes about the sale',
    })
    @IsOptional()
    @IsString()
    soldDescription?: string;
}
