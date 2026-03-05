import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, IsUUID, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Existing DTOs kept ────────────────────────────────────────────────────

export class HealthBreedingOverview {
    @ApiProperty()
    cowsUnderTreatment: number;

    @ApiProperty()
    pregnantCows: number;

    @ApiProperty()
    healthIssuesLast7Days: number;

    @ApiProperty()
    vaccinationsDueOverdueCount: number;
}

export class HealthBreedingTask {
    @ApiProperty()
    id: string;

    @ApiProperty()
    cowId: string;

    @ApiProperty()
    cowTagId: string;

    @ApiProperty({ nullable: true })
    cowName: string | null;

    @ApiProperty({ enum: ['VACCINATION_DUE', 'HEALTH_FOLLOWUP', 'PREGNANCY_CHECK', 'CALVING_EXPECTED', 'BREEDING_RECOMMENDATION'] })
    taskType: 'VACCINATION_DUE' | 'HEALTH_FOLLOWUP' | 'PREGNANCY_CHECK' | 'CALVING_EXPECTED' | 'BREEDING_RECOMMENDATION';

    @ApiProperty()
    dueDate: string;

    @ApiProperty({ enum: ['high', 'medium', 'low'] })
    urgency: 'high' | 'medium' | 'low';

    @ApiProperty()
    message: string;
}

// ─── Cow Health & Breeding List ────────────────────────────────────────────

export class CowHealthBreedingRow {
    @ApiProperty()
    id: string;

    @ApiProperty()
    tagId: string;

    @ApiPropertyOptional({ nullable: true })
    name: string | null;

    @ApiProperty({ enum: ['Healthy', 'Under Treatment', 'Pregnant', 'Dry'] })
    healthStatus: 'Healthy' | 'Under Treatment' | 'Pregnant' | 'Dry';

    @ApiPropertyOptional({ nullable: true })
    lastHealthEventDate: string | null;

    @ApiPropertyOptional({ nullable: true })
    lastHealthEventDescription: string | null;

    @ApiPropertyOptional({ nullable: true })
    lastBreedingEventDate: string | null;

    @ApiPropertyOptional({ nullable: true })
    lastBreedingEventType: string | null;

    @ApiPropertyOptional({ nullable: true })
    expectedCalvingDate: string | null;
}

// ─── Cow History ───────────────────────────────────────────────────────────

export class CowEventHistoryItem {
    @ApiProperty()
    id: string;

    @ApiProperty()
    type: string;

    @ApiProperty()
    date: string;

    @ApiProperty()
    description: string;

    @ApiPropertyOptional({ nullable: true })
    metadata: Record<string, any> | null;
}

export class CowHistory {
    @ApiProperty({ type: [CowEventHistoryItem] })
    health: CowEventHistoryItem[];

    @ApiProperty({ type: [CowEventHistoryItem] })
    breeding: CowEventHistoryItem[];

    @ApiProperty({ type: [CowEventHistoryItem] })
    vaccination: CowEventHistoryItem[];
}

// ─── Create DTOs ───────────────────────────────────────────────────────────

export class CreateHealthRecordDto {
    @ApiProperty()
    @IsUUID()
    cowId: string;

    @ApiProperty({ description: 'Health issue / diagnosis description' })
    @IsString()
    issue: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    treatmentType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    medication?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    withdrawalDays?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vetName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ description: 'YYYY-MM-DD' })
    @IsDateString()
    treatmentDate: string;
}

export class CreateBreedingEventDto {
    @ApiProperty()
    @IsUUID()
    cowId: string;

    @ApiProperty({ enum: ['heat', 'insemination', 'pregnancy_confirmed'] })
    @IsEnum(['heat', 'insemination', 'pregnancy_confirmed'])
    eventType: 'heat' | 'insemination' | 'pregnancy_confirmed';

    @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
    @IsOptional()
    @IsDateString()
    inseminationDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    bullId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    technicianName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class CreateVaccinationRecordDto {
    @ApiProperty()
    @IsUUID()
    cowId: string;

    @ApiProperty()
    @IsString()
    vaccineName: string;

    @ApiProperty({ description: 'YYYY-MM-DD' })
    @IsDateString()
    vaccinationDate: string;

    @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
    @IsOptional()
    @IsDateString()
    nextDueDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}
