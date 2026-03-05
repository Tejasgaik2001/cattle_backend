import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cow } from '../../entities/cow.entity';
import { CowEvent, HealthMetadata, BreedingMetadata, VaccinationMetadata } from '../../entities/cow-event.entity';
import {
    HealthBreedingOverview,
    HealthBreedingTask,
    CowHealthBreedingRow,
    CowHistory,
    CowEventHistoryItem,
    CreateHealthRecordDto,
    CreateBreedingEventDto,
    CreateVaccinationRecordDto,
} from '../../dto';

@Injectable()
export class HealthBreedingService {
    private readonly logger = new Logger(HealthBreedingService.name);

    constructor(
        @InjectRepository(Cow)
        private readonly cowRepository: Repository<Cow>,
        @InjectRepository(CowEvent)
        private readonly eventRepository: Repository<CowEvent>,
    ) { }

    // ─────────────────────────────────────────────────────────────────────────
    // EXISTING ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    async getOverview(farmId: string): Promise<HealthBreedingOverview> {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        const UnderTreatmentCount = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere("event.metadata->>'isUnderTreatment' = :isUnderTreatment", { isUnderTreatment: 'true' })
            .select('DISTINCT event.cow_id')
            .getCount();

        const pregnantCount = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .andWhere("event.metadata->>'result' = :result", { result: 'confirmed' })
            .select('DISTINCT event.cow_id')
            .getCount();

        const recentHealthIssues = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere('event.date >= :sevenDaysAgo', { sevenDaysAgo: sevenDaysAgo.toISOString().split('T')[0] })
            .getCount();

        const vaccinationsDueCount = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'VACCINATION' })
            .andWhere("event.metadata->>'nextDueDate' IS NOT NULL")
            .andWhere("event.metadata->>'nextDueDate' <= :nextWeek", {
                nextWeek: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
            .select('DISTINCT event.cow_id')
            .getCount();

        return {
            cowsUnderTreatment: UnderTreatmentCount,
            pregnantCows: pregnantCount,
            healthIssuesLast7Days: recentHealthIssues,
            vaccinationsDueOverdueCount: vaccinationsDueCount,
        };
    }

    async getTasks(farmId: string): Promise<HealthBreedingTask[]> {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const nextWeekStr = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const tasks: HealthBreedingTask[] = [];

        const events = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type IN (:...types)', { types: ['VACCINATION', 'HEALTH', 'BREEDING'] })
            .orderBy('event.date', 'DESC')
            .getMany();

        const cowEventsMap = new Map<string, CowEvent[]>();
        events.forEach(event => {
            const cowEvents = cowEventsMap.get(event.cowId) || [];
            cowEvents.push(event);
            cowEventsMap.set(event.cowId, cowEvents);
        });

        for (const [cowId, cowEvents] of cowEventsMap.entries()) {
            const cow = cowEvents[0].cow;
            const latestVaccination = cowEvents.find(e => e.type === 'VACCINATION');
            const latestHealth = cowEvents.find(e => e.type === 'HEALTH');
            const latestBreeding = cowEvents.find(e => e.type === 'BREEDING');

            if (latestVaccination?.metadata) {
                const meta = latestVaccination.metadata as VaccinationMetadata;
                if (meta.nextDueDate && meta.nextDueDate <= nextWeekStr) {
                    tasks.push({
                        id: `vac-${latestVaccination.id}`,
                        cowId,
                        cowTagId: cow.tagId,
                        cowName: cow.name,
                        taskType: 'VACCINATION_DUE',
                        dueDate: meta.nextDueDate,
                        urgency: meta.nextDueDate < todayStr ? 'high' : 'medium',
                        message: `Vaccination "${meta.vaccineName}" is ${meta.nextDueDate < todayStr ? 'OVERDUE' : 'due soon'}.`,
                    });
                }
            }

            if (latestHealth?.metadata) {
                const meta = latestHealth.metadata as HealthMetadata;
                if (meta.followUpDate && meta.followUpDate <= nextWeekStr) {
                    tasks.push({
                        id: `health-${latestHealth.id}`,
                        cowId,
                        cowTagId: cow.tagId,
                        cowName: cow.name,
                        taskType: 'HEALTH_FOLLOWUP',
                        dueDate: meta.followUpDate,
                        urgency: meta.followUpDate < todayStr ? 'high' : 'medium',
                        message: `Health follow-up for "${meta.diagnosis}" ${meta.followUpDate < todayStr ? 'was due' : 'due'} on ${meta.followUpDate}.`,
                    });
                }
            }

            if (latestBreeding?.metadata) {
                const meta = latestBreeding.metadata as BreedingMetadata;

                if (meta.result === 'confirmed' && meta.expectedCalvingDate && meta.expectedCalvingDate <= nextWeekStr) {
                    tasks.push({
                        id: `calving-${latestBreeding.id}`,
                        cowId,
                        cowTagId: cow.tagId,
                        cowName: cow.name,
                        taskType: 'CALVING_EXPECTED',
                        dueDate: meta.expectedCalvingDate,
                        urgency: 'high',
                        message: `Calving expected for ${cow.tagId} on ${meta.expectedCalvingDate}.`,
                    });
                }

                if (!meta.result || meta.result === 'pending') {
                    const breedingDate = new Date(latestBreeding.date);
                    const checkDate = new Date(breedingDate.getTime() + 45 * 24 * 60 * 60 * 1000);
                    const checkDateStr = checkDate.toISOString().split('T')[0];

                    if (checkDateStr <= nextWeekStr) {
                        tasks.push({
                            id: `preg-${latestBreeding.id}`,
                            cowId,
                            cowTagId: cow.tagId,
                            cowName: cow.name,
                            taskType: 'PREGNANCY_CHECK',
                            dueDate: checkDateStr,
                            urgency: checkDateStr < todayStr ? 'medium' : 'low',
                            message: `Pregnancy check recommended (45 days post-breeding) for ${cow.tagId}.`,
                        });
                    }
                }
            }
        }

        return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NEW ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns all active cows for the farm with their latest health/breeding status
     */
    async getCowHealthBreedingList(farmId: string): Promise<CowHealthBreedingRow[]> {
        const cows = await this.cowRepository.find({
            where: { farmId, lifecycleStatus: 'active' },
            order: { tagId: 'ASC' },
        });

        // Get latest events for all cows in one query
        const cowIds = cows.map(c => c.id);
        if (cowIds.length === 0) return [];

        const latestHealthEvents = await this.eventRepository
            .createQueryBuilder('event')
            .where('event.cow_id IN (:...cowIds)', { cowIds })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .orderBy('event.date', 'DESC')
            .getMany();

        const latestBreedingEvents = await this.eventRepository
            .createQueryBuilder('event')
            .where('event.cow_id IN (:...cowIds)', { cowIds })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .orderBy('event.date', 'DESC')
            .getMany();

        // Build maps: cowId -> latest event
        const healthMap = new Map<string, CowEvent>();
        latestHealthEvents.forEach(e => {
            if (!healthMap.has(e.cowId)) healthMap.set(e.cowId, e);
        });

        const breedingMap = new Map<string, CowEvent>();
        latestBreedingEvents.forEach(e => {
            if (!breedingMap.has(e.cowId)) breedingMap.set(e.cowId, e);
        });

        return cows.map(cow => {
            const healthEvent = healthMap.get(cow.id);
            const breedingEvent = breedingMap.get(cow.id);
            const breedingMeta = breedingEvent?.metadata as BreedingMetadata | undefined;
            const healthMeta = healthEvent?.metadata as HealthMetadata | undefined;

            // Determine health status
            let healthStatus: 'Healthy' | 'Under Treatment' | 'Pregnant' | 'Dry' = 'Healthy';
            if (healthMeta?.isUnderTreatment) {
                healthStatus = 'Under Treatment';
            } else if (breedingMeta?.result === 'confirmed') {
                healthStatus = 'Pregnant';
            }

            // Check if dry cow (within 60 days of expected calving)
            if (breedingMeta?.expectedCalvingDate) {
                const calving = new Date(breedingMeta.expectedCalvingDate);
                const daysUntilCalving = Math.ceil((calving.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysUntilCalving <= 60 && daysUntilCalving > 0 && breedingMeta.result === 'confirmed') {
                    healthStatus = 'Dry';
                }
            }

            return {
                id: cow.id,
                tagId: cow.tagId,
                name: cow.name,
                healthStatus,
                lastHealthEventDate: healthEvent?.date
                    ? new Date(healthEvent.date).toISOString().split('T')[0]
                    : null,
                lastHealthEventDescription: healthEvent?.description ?? null,
                lastBreedingEventDate: breedingEvent?.date
                    ? new Date(breedingEvent.date).toISOString().split('T')[0]
                    : null,
                lastBreedingEventType: breedingMeta
                    ? (breedingMeta.result ?? 'pending')
                    : null,
                expectedCalvingDate: breedingMeta?.expectedCalvingDate ?? null,
            };
        });
    }

    /**
     * Returns full event history (health, breeding, vaccination) for one cow
     */
    async getCowHistory(farmId: string, cowId: string): Promise<CowHistory> {
        // Verify cow belongs to farm
        const cow = await this.cowRepository.findOne({ where: { id: cowId, farmId } });
        if (!cow) throw new NotFoundException(`Cow ${cowId} not found in this farm`);

        const events = await this.eventRepository.find({
            where: { cowId },
            order: { date: 'DESC', createdAt: 'DESC' },
        });

        const toHistoryItem = (e: CowEvent): CowEventHistoryItem => ({
            id: e.id,
            type: e.type,
            date: new Date(e.date).toISOString().split('T')[0],
            description: e.description,
            metadata: e.metadata as Record<string, any> | null,
        });

        return {
            health: events.filter(e => e.type === 'HEALTH').map(toHistoryItem),
            breeding: events.filter(e => e.type === 'BREEDING').map(toHistoryItem),
            vaccination: events.filter(e => e.type === 'VACCINATION').map(toHistoryItem),
        };
    }

    /**
     * Create a HEALTH CowEvent record
     */
    async createHealthRecord(farmId: string, dto: CreateHealthRecordDto, createdBy: string): Promise<CowEvent> {
        const cow = await this.cowRepository.findOne({ where: { id: dto.cowId, farmId } });
        if (!cow) throw new NotFoundException(`Cow ${dto.cowId} not found`);

        const metadata: HealthMetadata = {
            diagnosis: dto.issue,
            treatment: dto.treatmentType ?? '',
            symptoms: [],
            isUnderTreatment: true,
        };

        const description = [
            dto.issue,
            dto.treatmentType ? `Treatment: ${dto.treatmentType}` : null,
            dto.medication ? `Medication: ${dto.medication}` : null,
            dto.vetName ? `Vet: ${dto.vetName}` : null,
            dto.withdrawalDays ? `Withdrawal: ${dto.withdrawalDays} days` : null,
        ]
            .filter(Boolean)
            .join(' | ');

        const event = this.eventRepository.create({
            cowId: dto.cowId,
            type: 'HEALTH',
            date: new Date(dto.treatmentDate),
            description,
            metadata: {
                ...metadata,
                treatmentType: dto.treatmentType,
                medication: dto.medication,
                withdrawalDays: dto.withdrawalDays,
                vetName: dto.vetName,
                notes: dto.notes,
            } as any,
            createdBy,
        });

        return this.eventRepository.save(event);
    }

    /**
     * Create a BREEDING CowEvent. Auto-calculates expected calving date if pregnancy_confirmed.
     */
    async createBreedingEvent(farmId: string, dto: CreateBreedingEventDto, createdBy: string): Promise<CowEvent> {
        const cow = await this.cowRepository.findOne({ where: { id: dto.cowId, farmId } });
        if (!cow) throw new NotFoundException(`Cow ${dto.cowId} not found`);

        let expectedCalvingDate: string | undefined;
        if (dto.eventType === 'pregnancy_confirmed' && dto.inseminationDate) {
            const insemDate = new Date(dto.inseminationDate);
            insemDate.setDate(insemDate.getDate() + 283);
            expectedCalvingDate = insemDate.toISOString().split('T')[0];
        }

        const breeding: BreedingMetadata = {
            sire: dto.bullId ?? '',
            method: 'AI',
            result: dto.eventType === 'pregnancy_confirmed' ? 'confirmed'
                : dto.eventType === 'insemination' ? 'pending'
                    : undefined,
            expectedCalvingDate,
        };

        const eventDate = dto.inseminationDate ? new Date(dto.inseminationDate) : new Date();
        const description = [
            `Breeding event: ${dto.eventType}`,
            dto.bullId ? `Bull/Semen: ${dto.bullId}` : null,
            dto.technicianName ? `Tech: ${dto.technicianName}` : null,
            expectedCalvingDate ? `Expected calving: ${expectedCalvingDate}` : null,
        ]
            .filter(Boolean)
            .join(' | ');

        const event = this.eventRepository.create({
            cowId: dto.cowId,
            type: 'BREEDING',
            date: eventDate,
            description,
            metadata: {
                ...breeding,
                eventType: dto.eventType,
                technicianName: dto.technicianName,
                notes: dto.notes,
            } as any,
            createdBy,
        });

        return this.eventRepository.save(event);
    }

    /**
     * Create a VACCINATION CowEvent record
     */
    async createVaccinationRecord(farmId: string, dto: CreateVaccinationRecordDto, createdBy: string): Promise<CowEvent> {
        const cow = await this.cowRepository.findOne({ where: { id: dto.cowId, farmId } });
        if (!cow) throw new NotFoundException(`Cow ${dto.cowId} not found`);

        const vaccination: VaccinationMetadata = {
            vaccineName: dto.vaccineName,
            nextDueDate: dto.nextDueDate,
        };

        const description = [
            `Vaccination: ${dto.vaccineName}`,
            dto.nextDueDate ? `Next due: ${dto.nextDueDate}` : null,
            dto.notes ? dto.notes : null,
        ]
            .filter(Boolean)
            .join(' | ');

        const event = this.eventRepository.create({
            cowId: dto.cowId,
            type: 'VACCINATION',
            date: new Date(dto.vaccinationDate),
            description,
            metadata: {
                ...vaccination,
                notes: dto.notes,
            } as any,
            createdBy,
        });

        return this.eventRepository.save(event);
    }
}
