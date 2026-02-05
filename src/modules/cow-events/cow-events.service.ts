import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CowEvent, CowEventType, VaccinationMetadata, BreedingMetadata, HealthMetadata } from '../../entities/cow-event.entity';
import { CreateCowEventDto, UpdateCowEventDto } from '../../dto/cow-event';
import { isFutureDate } from '../../common/utils/date.utils';
import { getPagination, createPaginatedResult, PaginatedResult } from '../../common/utils/pagination.utils';

@Injectable()
export class CowEventsService {
    constructor(
        @InjectRepository(CowEvent)
        private cowEventRepository: Repository<CowEvent>,
    ) { }

    /**
     * Create a new cow event
     */
    async create(cowId: string, createCowEventDto: CreateCowEventDto, userId: string): Promise<CowEvent> {
        // Validate date is not in the future
        if (isFutureDate(createCowEventDto.date)) {
            throw new BadRequestException('Event date cannot be in the future');
        }

        const event = this.cowEventRepository.create({
            ...createCowEventDto,
            cowId,
            createdBy: userId,
        });

        return this.cowEventRepository.save(event);
    }

    /**
     * Get all events for a cow
     */
    async findAllForCow(
        cowId: string,
        options?: { type?: CowEventType; page?: number; limit?: number },
    ): Promise<PaginatedResult<CowEvent>> {
        const { skip, take } = getPagination(options || {});

        const queryBuilder = this.cowEventRepository
            .createQueryBuilder('event')
            .where('event.cowId = :cowId', { cowId })
            .orderBy('event.date', 'DESC')
            .addOrderBy('event.createdAt', 'DESC');

        if (options?.type) {
            queryBuilder.andWhere('event.type = :type', { type: options.type });
        }

        const total = await queryBuilder.getCount();
        const events = await queryBuilder.skip(skip).take(take).getMany();

        return createPaginatedResult(events, total, options || {});
    }

    /**
     * Get a single event
     */
    async findOne(cowId: string, eventId: string): Promise<CowEvent> {
        const event = await this.cowEventRepository.findOne({
            where: { id: eventId, cowId },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return event;
    }

    /**
     * Update an event
     */
    async update(
        cowId: string,
        eventId: string,
        updateCowEventDto: UpdateCowEventDto,
    ): Promise<CowEvent> {
        const event = await this.findOne(cowId, eventId);

        // Validate date if provided
        if (updateCowEventDto.date && isFutureDate(updateCowEventDto.date)) {
            throw new BadRequestException('Event date cannot be in the future');
        }

        Object.assign(event, updateCowEventDto);
        return this.cowEventRepository.save(event);
    }

    /**
     * Delete an event
     */
    async remove(cowId: string, eventId: string): Promise<void> {
        const event = await this.findOne(cowId, eventId);
        await this.cowEventRepository.remove(event);
    }

    /**
     * Get recent events for a cow (for timeline)
     */
    async getRecentEvents(cowId: string, limit: number = 10): Promise<CowEvent[]> {
        return this.cowEventRepository.find({
            where: { cowId },
            order: { date: 'DESC', createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Get events by type for a farm (for dashboard/reports)
     */
    async getEventsByTypeForFarm(
        farmId: string,
        type: CowEventType,
        options?: { startDate?: string; endDate?: string },
    ): Promise<CowEvent[]> {
        const queryBuilder = this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('event.type = :type', { type })
            .orderBy('event.date', 'DESC');

        if (options?.startDate) {
            queryBuilder.andWhere('event.date >= :startDate', { startDate: options.startDate });
        }

        if (options?.endDate) {
            queryBuilder.andWhere('event.date <= :endDate', { endDate: options.endDate });
        }

        return queryBuilder.getMany();
    }

    /**
     * Get vaccination events with upcoming due dates
     */
    async getUpcomingVaccinations(farmId: string, daysAhead: number = 30): Promise<CowEvent[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];

        return this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'VACCINATION' })
            .andWhere("event.metadata->>'nextDueDate' IS NOT NULL")
            .andWhere("event.metadata->>'nextDueDate' <= :futureDate", { futureDate: futureDateStr })
            .orderBy("event.metadata->>'nextDueDate'", 'ASC')
            .getMany();
    }

    /**
     * Count events by type for a cow
     */
    async countEventsByType(cowId: string): Promise<Record<CowEventType, number>> {
        const results = await this.cowEventRepository
            .createQueryBuilder('event')
            .select('event.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .where('event.cowId = :cowId', { cowId })
            .groupBy('event.type')
            .getRawMany();

        const counts: Record<CowEventType, number> = {
            HEALTH: 0,
            VACCINATION: 0,
            BREEDING: 0,
            NOTE: 0,
            FINANCIAL: 0,
        };

        results.forEach((r) => {
            counts[r.type as CowEventType] = parseInt(r.count, 10);
        });

        return counts;
    }

    /**
     * Get health and breeding overview metrics for a farm
     */
    async getHealthBreedingOverview(farmId: string): Promise<any> {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        // 1. Cows Under Treatment
        const cowsUnderTreatment = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere("event.metadata->>'isUnderTreatment' = 'true'")
            .select('COUNT(DISTINCT event.cowId)', 'count')
            .getRawOne();

        // 2. Pregnant Cows (inferred from latest breeding event)
        const pregnantCows = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .andWhere("event.metadata->>'result' = 'confirmed'")
            .andWhere("event.metadata->>'expectedCalvingDate' >= :today", { today: today.toISOString().split('T')[0] })
            .select('COUNT(DISTINCT event.cowId)', 'count')
            .getRawOne();

        // 3. Health Issues Last 7 Days
        const healthIssuesRecent = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere('event.date >= :sevenDaysAgo', { sevenDaysAgo: sevenDaysAgo.toISOString().split('T')[0] })
            .select('COUNT(*)', 'count')
            .getRawOne();

        // 4. Vaccinations Due/Overdue
        const vaccinationsDueOverdue = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'VACCINATION' })
            .andWhere("event.metadata->>'nextDueDate' IS NOT NULL")
            .andWhere("event.metadata->>'nextDueDate' <= :today", { today: today.toISOString().split('T')[0] })
            .select('COUNT(DISTINCT event.cowId)', 'count')
            .getRawOne();

        return {
            cowsUnderTreatment: parseInt(cowsUnderTreatment.count, 10) || 0,
            pregnantCows: parseInt(pregnantCows.count, 10) || 0,
            healthIssuesLast7Days: parseInt(healthIssuesRecent.count, 10) || 0,
            vaccinationsDueOverdueCount: parseInt(vaccinationsDueOverdue.count, 10) || 0,
        };
    }

    /**
     * Get upcoming and overdue health/breeding tasks for a farm
     */
    async getHealthBreedingTasks(farmId: string): Promise<any[]> {
        const todayStr = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        const tasks: any[] = [];

        // 1. Vaccination Tasks
        const vaccinations = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'VACCINATION' })
            .andWhere("event.metadata->>'nextDueDate' IS NOT NULL")
            .andWhere("event.metadata->>'nextDueDate' <= :futureDate", { futureDate: futureDateStr })
            .getMany();

        vaccinations.forEach(v => {
            const nextDueDate = (v.metadata as VaccinationMetadata)?.nextDueDate;
            if (nextDueDate) {
                const isOverdue = nextDueDate < todayStr;
                tasks.push({
                    id: `vac-${v.id}`,
                    cowId: v.cowId,
                    cowTagId: v.cow.tagId,
                    cowName: v.cow.name,
                    taskType: 'VACCINATION_DUE',
                    dueDate: nextDueDate,
                    urgency: isOverdue ? 'high' : 'medium',
                    message: `${(v.metadata as VaccinationMetadata).vaccineName} vaccination due`,
                });
            }
        });

        // 2. Health Follow-ups
        const healthFollowUps = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere("event.metadata->>'followUpDate' IS NOT NULL")
            .andWhere("event.metadata->>'followUpDate' <= :futureDate", { futureDate: futureDateStr })
            .getMany();

        healthFollowUps.forEach(h => {
            const followUpDate = (h.metadata as HealthMetadata)?.followUpDate;
            if (followUpDate) {
                const isOverdue = followUpDate < todayStr;
                tasks.push({
                    id: `health-${h.id}`,
                    cowId: h.cowId,
                    cowTagId: h.cow.tagId,
                    cowName: h.cow.name,
                    taskType: 'HEALTH_FOLLOWUP',
                    dueDate: followUpDate,
                    urgency: isOverdue ? 'high' : 'medium',
                    message: `Health follow-up for ${h.cow.tagId}`,
                });
            }
        });

        // 3. Calving Tasks
        const calvingExpected = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .andWhere("event.metadata->>'expectedCalvingDate' IS NOT NULL")
            .andWhere("event.metadata->>'result' = 'confirmed'")
            .andWhere("event.metadata->>'expectedCalvingDate' <= :futureDate", { futureDate: futureDateStr })
            .getMany();

        calvingExpected.forEach(b => {
            const expectedCalvingDate = (b.metadata as BreedingMetadata)?.expectedCalvingDate;
            if (expectedCalvingDate) {
                const isOverdue = expectedCalvingDate < todayStr;
                tasks.push({
                    id: `calv-${b.id}`,
                    cowId: b.cowId,
                    cowTagId: b.cow.tagId,
                    cowName: b.cow.name,
                    taskType: 'CALVING_EXPECTED',
                    dueDate: expectedCalvingDate,
                    urgency: isOverdue ? 'high' : 'medium',
                    message: `Expected calving for ${b.cow.tagId}`,
                });
            }
        });

        // Sort by due date ASC, urgency high first
        return tasks.sort((a, b) => {
            if (a.dueDate !== b.dueDate) {
                return a.dueDate.localeCompare(b.dueDate);
            }
            const urgencyMap = { high: 0, medium: 1, low: 2 };
            return urgencyMap[a.urgency as 'high' | 'medium' | 'low'] - urgencyMap[b.urgency as 'high' | 'medium' | 'low'];
        });
    }
}
