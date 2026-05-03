import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoanDto {
    @ApiProperty({ example: 'SBI Bank', description: 'Name of the lender (bank or person)' })
    @IsString()
    lenderName: string;

    @ApiProperty({ example: 100000, description: 'Original loan amount in INR' })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    principalAmount: number;

    @ApiProperty({ example: 12, description: 'Annual interest rate in %' })
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    interestRate: number;

    @ApiProperty({ example: '2025-01-01', description: 'Loan start date (YYYY-MM-DD)' })
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({
        example: 'simple',
        description: 'Interest type',
        enum: ['simple', 'compound'],
        default: 'simple',
    })
    @IsOptional()
    @IsIn(['simple', 'compound'])
    type?: 'simple' | 'compound';

    @ApiPropertyOptional({ example: 'Vehicle loan for tractor', description: 'Optional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}
