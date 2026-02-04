import { IsOptional, IsDateString, IsIn, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionFilterDto {
    @IsOptional()
    @IsString()
    @IsIn(['expense', 'income'])
    type?: 'expense' | 'income';

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD)' })
    startDate?: string;

    @IsOptional()
    @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD)' })
    endDate?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 20;
}
