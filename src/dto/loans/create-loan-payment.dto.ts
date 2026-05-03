import {
    IsString,
    IsOptional,
    IsDateString,
    IsNumber,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoanPaymentDto {
    @ApiProperty({ example: '2025-03-01', description: 'Date of payment (YYYY-MM-DD)' })
    @IsDateString()
    paymentDate: string;

    @ApiProperty({ example: 5000, description: 'Total amount paid in INR' })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    amountPaid: number;

    @ApiPropertyOptional({ example: 1000, description: 'Interest portion of this payment' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    interestComponent?: number;

    @ApiPropertyOptional({ example: 4000, description: 'Principal portion of this payment' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    principalComponent?: number;

    @ApiPropertyOptional({ example: 'March EMI', description: 'Optional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}
