import {
    IsString,
    IsDateString,
    IsNumber,
    IsIn,
    IsUUID,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMilkRecordDto {
    @ApiProperty({
        example: 'uuid-of-cow',
        description: 'UUID of the cow',
    })
    @IsUUID('4', { message: 'Cow ID must be a valid UUID' })
    cowId: string;

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
}
