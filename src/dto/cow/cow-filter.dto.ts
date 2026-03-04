import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CowFilterDto {
    @ApiPropertyOptional({
        example: 'GV-001',
        description: 'Search by tag ID or name',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        example: 'active',
        description: 'Filter by lifecycle status',
        enum: ['active', 'sold', 'deceased'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['active', 'sold', 'deceased'])
    lifecycleStatus?: 'active' | 'sold' | 'deceased';

    @ApiPropertyOptional({
        example: 'female',
        description: 'Filter by gender',
        enum: ['male', 'female'],
    })
    @IsOptional()
    @IsString()
    @IsIn(['male', 'female'])
    gender?: 'male' | 'female';

    @ApiPropertyOptional({
        example: 'Gir',
        description: 'Filter by breed',
    })
    @IsOptional()
    @IsString()
    breed?: string;

    @ApiPropertyOptional({
        description: 'Filter cows currently under treatment',
    })
    @IsOptional()
    isUnderTreatment?: string;

    @ApiPropertyOptional({
        description: 'Filter confirmed pregnant cows',
    })
    @IsOptional()
    isPregnant?: string;

    @ApiPropertyOptional({
        description: 'Filter cows with health issues in the last 7 days',
    })
    @IsOptional()
    healthIssuesRecent?: string;

    @ApiPropertyOptional({
        description: 'Filter cows with due or overdue vaccinations',
    })
    @IsOptional()
    vaccinationsDue?: string;

    @ApiPropertyOptional({
        example: 1,
        description: 'Page number (starts from 1)',
        default: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({
        example: 20,
        description: 'Number of items per page (max 100)',
        default: 20,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 20;

    @ApiPropertyOptional({
        example: 'createdAt',
        description: 'Field to sort by',
        enum: ['tagId', 'name', 'dateOfBirth', 'createdAt'],
        default: 'createdAt',
    })
    @IsOptional()
    @IsString()
    @IsIn(['tagId', 'name', 'dateOfBirth', 'createdAt'])
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({
        example: 'DESC',
        description: 'Sort order',
        enum: ['ASC', 'DESC'],
        default: 'DESC',
    })
    @IsOptional()
    @IsString()
    @IsIn(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
