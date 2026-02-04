import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CowEvent, CowEventType } from '../../entities/cow-event.entity';
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
}
