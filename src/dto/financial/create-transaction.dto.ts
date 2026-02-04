import {
    IsString,
    IsOptional,
    IsIn,
    IsDateString,
    IsNumber,
    IsUUID,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const EXPENSE_CATEGORIES = [
    'Feed',
    'Veterinary',
    'Breeding / AI',
    'Labor',
    'Utilities',
    'Maintenance / Miscellaneous',
];

const INCOME_CATEGORIES = ['Milk Sales', 'Cow Sales', 'Other Income'];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export class CreateTransactionDto {
    @ApiProperty({
        example: 'expense',
        description: 'Transaction type',
        enum: ['expense', 'income'],
    })
    @IsString()
    @IsIn(['expense', 'income'], { message: 'Type must be expense or income' })
    type: 'expense' | 'income';

    @ApiProperty({
        example: 'Feed',
        description: 'Transaction category',
        enum: ALL_CATEGORIES,
    })
    @IsString()
    @IsIn(ALL_CATEGORIES, {
        message: `Category must be one of: ${ALL_CATEGORIES.join(', ')}`,
    })
    category: string;

    @ApiProperty({
        example: 25000,
        description: 'Amount in INR',
        minimum: 0,
    })
    @IsNumber({}, { message: 'Amount must be a number' })
    @Min(0, { message: 'Amount cannot be negative' })
    @Type(() => Number)
    amount: number;

    @ApiProperty({
        example: '2024-01-20',
        description: 'Transaction date (YYYY-MM-DD format)',
    })
    @IsDateString({}, { message: 'Date must be a valid date (YYYY-MM-DD)' })
    date: string;

    @ApiPropertyOptional({
        example: 'Monthly cattle feed supply',
        description: 'Description of the transaction',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        example: 'uuid-of-cow',
        description: 'UUID of related cow (if applicable)',
    })
    @IsOptional()
    @IsUUID('4', { message: 'Cow ID must be a valid UUID' })
    cowId?: string;
}
