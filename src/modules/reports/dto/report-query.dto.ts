import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportTimeframe {
    TODAY = 'today',
    YESTERDAY = 'yesterday',
    LAST_7_DAYS = 'last_7_days',
    LAST_30_DAYS = 'last_30_days',
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    YEARLY = 'yearly',
    FINANCIAL_YEAR = 'financial_year',
    CUSTOM = 'custom',
}

export enum ExportFormat {
    EXCEL = 'excel',
    CSV = 'csv',
    PDF = 'pdf',
}

export class ReportQueryDto {
    @ApiPropertyOptional({ enum: ReportTimeframe })
    @IsOptional()
    @IsEnum(ReportTimeframe)
    timeframe?: ReportTimeframe;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sortOrder?: 'ASC' | 'DESC';

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cowId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    category?: string;
}

export class ExportReportDto extends ReportQueryDto {
    @ApiPropertyOptional({ enum: ExportFormat })
    @IsOptional()
    @IsEnum(ExportFormat)
    format?: ExportFormat;
}
