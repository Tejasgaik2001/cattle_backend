import {
    IsArray,
    ValidateNested,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateMilkRecordDto } from './create-milk-record.dto';

export class BulkMilkRecordDto {
    @ApiProperty({
        type: [CreateMilkRecordDto],
        description: 'Array of milk records to create',
    })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one milk record is required' })
    @ValidateNested({ each: true })
    @Type(() => CreateMilkRecordDto)
    records: CreateMilkRecordDto[];
}
