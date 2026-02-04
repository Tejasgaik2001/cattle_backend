import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CowEvent, HealthMetadata, VaccinationMetadata, BreedingMetadata } from '../../entities/cow-event.entity';
import { Cow } from '../../entities/cow.entity';
import { formatDate, addDays } from '../../common/utils/date.utils';

export interface Alert {
    id: string;
    type: 'vaccination_due' | 'health_issue' | 'calving_expected' | 'breeding_recommendation';
    title: string;
    message: string;
    cowId: string;
    cowTagId: string;
    cowName: string | null;
    priority: 'high' | 'medium' | 'low';
    dueDate?: string;
    createdAt: string;
}

@Injectable()
export class AlertsService {
    constructor(
        @InjectRepository(CowEvent)
        private cowEventRepository: Repository<CowEvent>,
        @InjectRepository(Cow)
        private cowRepository: Repository<Cow>,
    ) { }

    /**
     * Get all active alerts for a farm (generated on-demand)
     */
    async getAlerts(farmId: string): Promise<Alert[]> {
        const alerts: Alert[] = [];

        // Get vaccination alerts
        const vaccinationAlerts = await this.getVaccinationAlerts(farmId);
        alerts.push(...vaccinationAlerts);

        // Get health alerts (cows under treatment)
        const healthAlerts = await this.getHealthAlerts(farmId);
        alerts.push(...healthAlerts);

        // Get calving alerts
        const calvingAlerts = await this.getCalvingAlerts(farmId);
        alerts.push(...calvingAlerts);

        // Sort by priority and due date
        return alerts.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            return 0;
        });
    }

    /**
     * Get vaccination due alerts
     */
    private async getVaccinationAlerts(farmId: string): Promise<Alert[]> {
        const today = new Date();
        const todayStr = formatDate(today);
        const futureDate = addDays(today, 14);
        const futureDateStr = formatDate(futureDate);

        // Get latest vaccination events with nextDueDate
        const events = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'VACCINATION' })
            .andWhere("event.metadata->>'nextDueDate' IS NOT NULL")
            .andWhere("event.metadata->>'nextDueDate' <= :futureDate", { futureDate: futureDateStr })
            .orderBy('event.date', 'DESC')
            .getMany();

        const alerts: Alert[] = [];
        const processedCows = new Set<string>();

        for (const event of events) {
            if (processedCows.has(event.cowId)) continue;
            processedCows.add(event.cowId);

            const metadata = event.metadata as VaccinationMetadata;
            const dueDate = metadata.nextDueDate;

            if (!dueDate) continue;

            const isOverdue = dueDate < todayStr;
            const priority: 'high' | 'medium' | 'low' = isOverdue ? 'high' : 'medium';

            alerts.push({
                id: `vax-${event.id}`,
                type: 'vaccination_due',
                title: isOverdue ? 'Vaccination Overdue' : 'Vaccination Due',
                message: `${metadata.vaccineName} ${isOverdue ? 'was due' : 'is due'} on ${dueDate}`,
                cowId: event.cowId,
                cowTagId: event.cow.tagId,
                cowName: event.cow.name,
                priority,
                dueDate,
                createdAt: event.createdAt.toISOString(),
            });
        }

        return alerts;
    }

    /**
     * Get health issue alerts
     */
    private async getHealthAlerts(farmId: string): Promise<Alert[]> {
        // Get cows currently under treatment
        const events = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere("event.metadata->>'isUnderTreatment' = :value", { value: 'true' })
            .orderBy('event.date', 'DESC')
            .getMany();

        const alerts: Alert[] = [];
        const processedCows = new Set<string>();

        for (const event of events) {
            if (processedCows.has(event.cowId)) continue;
            processedCows.add(event.cowId);

            const metadata = event.metadata as HealthMetadata;

            alerts.push({
                id: `health-${event.id}`,
                type: 'health_issue',
                title: 'Under Treatment',
                message: metadata.diagnosis || event.description,
                cowId: event.cowId,
                cowTagId: event.cow.tagId,
                cowName: event.cow.name,
                priority: 'high',
                dueDate: metadata.followUpDate,
                createdAt: event.createdAt.toISOString(),
            });
        }

        return alerts;
    }

    /**
     * Get calving expected alerts
     */
    private async getCalvingAlerts(farmId: string): Promise<Alert[]> {
        const today = new Date();
        const todayStr = formatDate(today);
        const futureDate = addDays(today, 30);
        const futureDateStr = formatDate(futureDate);

        // Get breeding events with expected calving date
        const events = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .andWhere("event.metadata->>'result' = :result", { result: 'confirmed' })
            .andWhere("event.metadata->>'expectedCalvingDate' IS NOT NULL")
            .andWhere("event.metadata->>'expectedCalvingDate' <= :futureDate", { futureDate: futureDateStr })
            .andWhere("event.metadata->>'expectedCalvingDate' >= :today", { today: todayStr })
            .orderBy("event.metadata->>'expectedCalvingDate'", 'ASC')
            .getMany();

        const alerts: Alert[] = [];
        const processedCows = new Set<string>();

        for (const event of events) {
            if (processedCows.has(event.cowId)) continue;
            processedCows.add(event.cowId);

            const metadata = event.metadata as BreedingMetadata;
            const expectedDate = metadata.expectedCalvingDate;

            if (!expectedDate) continue;

            const daysUntil = Math.ceil(
                (new Date(expectedDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );

            const priority: 'high' | 'medium' | 'low' = daysUntil <= 7 ? 'high' : daysUntil <= 14 ? 'medium' : 'low';

            alerts.push({
                id: `calving-${event.id}`,
                type: 'calving_expected',
                title: 'Calving Expected',
                message: `Expected calving in ${daysUntil} days (${expectedDate})`,
                cowId: event.cowId,
                cowTagId: event.cow.tagId,
                cowName: event.cow.name,
                priority,
                dueDate: expectedDate,
                createdAt: event.createdAt.toISOString(),
            });
        }

        return alerts;
    }
}
