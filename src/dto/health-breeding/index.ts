import { ApiProperty } from '@nestjs/swagger';

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
