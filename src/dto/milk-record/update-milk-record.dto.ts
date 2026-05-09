import {
    IsNumber,
    Min,
    IsOptional,
    IsBoolean,
    IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMilkRecordDto {
    @ApiPropertyOptional({ example: 12.0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    amount?: number;

    @ApiPropertyOptional({ example: 46.5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    pricePerLiter?: number;

    @ApiPropertyOptional({ example: 11.8 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    dairyAmount?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    dairyPricePerLiter?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    fat?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    snf?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    dairyFat?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    dairySnf?: number | null;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isReconciled?: boolean;

    @ApiPropertyOptional({ example: 'Dairy measurement confirmed' })
    @IsOptional()
    @IsString()
    notes?: string | null;
}

