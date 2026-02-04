import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCowEventDto {
    @ApiProperty({
        example: 'VACCINATION',
        description: 'Type of event',
        enum: ['HEALTH', 'VACCINATION', 'BREEDING', 'NOTE', 'FINANCIAL'],
    })
    @IsString()
    @IsIn(['HEALTH', 'VACCINATION', 'BREEDING', 'NOTE', 'FINANCIAL'], {
        message: 'Type must be HEALTH, VACCINATION, BREEDING, NOTE, or FINANCIAL',
    })
    type: 'HEALTH' | 'VACCINATION' | 'BREEDING' | 'NOTE' | 'FINANCIAL';

    @ApiProperty({
        example: '2024-01-20',
        description: 'Date of the event (YYYY-MM-DD format)',
    })
    @IsDateString({}, { message: 'Date must be a valid date (YYYY-MM-DD)' })
    date: string;

    @ApiProperty({
        example: 'FMD Vaccination administered',
        description: 'Description of the event',
    })
    @IsString()
    description: string;

    @ApiPropertyOptional({
        description: 'Type-specific metadata (JSON object)',
        example: { vaccineName: 'FMD Vaccine', nextDueDate: '2024-07-20' },
    })
    @IsOptional()
    metadata?: Record<string, unknown>;
}
