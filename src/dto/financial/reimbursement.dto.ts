import { IsUUID, IsOptional, IsIn, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MarkReimbursementPaidDto {
    @ApiPropertyOptional({ example: '2025-05-08', description: 'Date the reimbursement was paid' })
    @IsOptional()
    @IsDateString()
    paidDate?: string;

    @ApiPropertyOptional({ example: 'Cash paid at home' })
    @IsOptional()
    @IsString()
    note?: string;
}

export class ReimbursementFilterDto {
    @ApiPropertyOptional({ enum: ['PENDING', 'PAID'] })
    @IsOptional()
    @IsIn(['PENDING', 'PAID'])
    status?: 'PENDING' | 'PAID';

    @ApiPropertyOptional({ description: 'Filter by person UUID' })
    @IsOptional()
    @IsUUID('4')
    personId?: string;
}
