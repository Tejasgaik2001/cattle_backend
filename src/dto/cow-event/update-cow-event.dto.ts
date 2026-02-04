import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
} from 'class-validator';

export class UpdateCowEventDto {
    @IsOptional()
    @IsString()
    @IsIn(['HEALTH', 'VACCINATION', 'BREEDING', 'NOTE', 'FINANCIAL'], {
        message: 'Type must be HEALTH, VACCINATION, BREEDING, NOTE, or FINANCIAL',
    })
    type?: 'HEALTH' | 'VACCINATION' | 'BREEDING' | 'NOTE' | 'FINANCIAL';

    @IsOptional()
    @IsDateString({}, { message: 'Date must be a valid date (YYYY-MM-DD)' })
    date?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    metadata?: Record<string, unknown>;
}
