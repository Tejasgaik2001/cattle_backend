import {
    IsString,
    IsDateString,
    IsNumber,
    IsIn,
    IsUUID,
    Min,
    IsOptional,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMilkRecordDto {
    @ApiPropertyOptional({
        example: 'uuid-of-cow',
        description: 'UUID of the cow. If null, treated as a bulk/collective record.',
    })
    @IsOptional()
    @IsUUID('4', { message: 'Cow ID must be a valid UUID' })
    cowId?: string;

    @ApiProperty({
        example: '2024-01-20',
        description: 'Date of milking (YYYY-MM-DD format)',
    })
    @IsDateString({}, { message: 'Date must be a valid date (YYYY-MM-DD)' })
    date: string;

    @ApiProperty({
        example: 'AM',
        description: 'Milking session',
        enum: ['AM', 'PM'],
    })
    @IsString()
    @IsIn(['AM', 'PM'], { message: 'Milking time must be AM or PM' })
    milkingTime: 'AM' | 'PM';

    @ApiProperty({
        example: 12.5,
        description: 'Amount of milk in liters',
        minimum: 0,
    })
    @IsNumber({}, { message: 'Amount must be a number' })
    @Min(0, { message: 'Amount cannot be negative' })
    @Type(() => Number)
    amount: number;

    @ApiPropertyOptional({
        example: true,
        description: 'Whether this is a bulk/collective entry for multiple cows',
    })
    @IsOptional()
    @IsBoolean()
    isBulk?: boolean;

    @ApiPropertyOptional({
        example: 45.0,
        description: 'Price per liter in local currency',
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    pricePerLiter?: number;

    @IsOptional()
    @IsString()
    notes?: string;
}


