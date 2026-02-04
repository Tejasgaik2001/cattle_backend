import { IsOptional, IsDateString, IsUUID, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MilkRecordFilterDto {
    @IsOptional()
    @IsUUID('4', { message: 'Cow ID must be a valid UUID' })
    cowId?: string;

    @IsOptional()
    @IsDateString({}, { message: 'Start date must be a valid date (YYYY-MM-DD)' })
    startDate?: string;

    @IsOptional()
    @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD)' })
    endDate?: string;

    @IsOptional()
    @IsString()
    @IsIn(['AM', 'PM'])
    milkingTime?: 'AM' | 'PM';

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
