import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cow } from '../../entities/cow.entity';
import { CowEvent, HealthMetadata, BreedingMetadata, VaccinationMetadata } from '../../entities/cow-event.entity';
import { HealthBreedingOverview, HealthBreedingTask } from '../../dto';

@Injectable()
export class HealthBreedingService {
    private readonly logger = new Logger(HealthBreedingService.name);

    constructor(
        @InjectRepository(Cow)
        private readonly cowRepository: Repository<Cow>,
        @InjectRepository(CowEvent)
        private readonly eventRepository: Repository<CowEvent>,
    ) { }

    async getOverview(farmId: string): Promise<HealthBreedingOverview> {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        // 1. Cows Under Treatment
        // Logic: Find events of type HEALTH where metadata->isUnderTreatment is true
        // We do a join with Cow to filter by farmId
        const UnderTreatmentCount = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere("event.metadata->>'isUnderTreatment' = :isUnderTreatment", { isUnderTreatment: 'true' })
            .select('DISTINCT event.cow_id')
            .getCount();

        // 2. Pregnant Cows
        // Logic: Breed events with result = 'confirmed'
        const pregnantCount = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .andWhere("event.metadata->>'result' = :result", { result: 'confirmed' })
            .select('DISTINCT event.cow_id')
            .getCount();

        // 3. Health Issues Last 7 Days
        const recentHealthIssues = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere('event.date >= :sevenDaysAgo', { sevenDaysAgo: sevenDaysAgo.toISOString().split('T')[0] })
            .getCount();

        // 4. Vaccinations Due/Overdue
        // Logic: Vaccination events where metadata->nextDueDate is present and (optionally) we could check if a newer vaccination exists.
        // For simplicity, we'll count cows that have a nextDueDate in the past or coming 7 days.
        const vaccinationsDueCount = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'VACCINATION' })
            .andWhere("event.metadata->>'nextDueDate' IS NOT NULL")
            .andWhere("event.metadata->>'nextDueDate' <= :nextWeek", { 
                nextWeek: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
            })
            // Ideally we'd filter out cows that already had a vaccination AFTER this event's date
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

        // Fetch all relevant events for the farm to process heuristics
        // In a large farm, this might need more optimized queries.
        const events = await this.eventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farm_id = :farmId', { farmId })
            .andWhere('event.type IN (:...types)', { types: ['VACCINATION', 'HEALTH', 'BREEDING'] })
            .orderBy('event.date', 'DESC')
            .getMany();

        // Group events by cow for easier heuristic processing
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

            // 1. Vaccination Task
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

            // 2. Health Follow-up
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

            // 3. Pregnancy Check / Calving Expected
            if (latestBreeding?.metadata) {
                const meta = latestBreeding.metadata as BreedingMetadata;
                
                // Calving Expected
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

                // Pregnancy Check Heuristic: 45 days after breeding if result is pending/missing
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
}
