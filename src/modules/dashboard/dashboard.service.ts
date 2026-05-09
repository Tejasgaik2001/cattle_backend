import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cow } from '../../entities/cow.entity';
import { MilkRecord } from '../../entities/milk-record.entity';
import { MemberDue } from '../../entities/member-due.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { formatDate } from '../../common/utils/date.utils';

export interface DashboardSummary {
    totalHerdSize: number;
    activeCount: number;
    lactatingCowsCount: number;
    pregnantCowsCount: number;
    cowsUnderTreatmentCount: number;
    todayMilkTotal: number;
    yesterdayMilkTotal: number;
    milkChangePercent: number;
    pendingReimbursementTotal: number;
}

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Cow)
        private cowRepository: Repository<Cow>,
        @InjectRepository(CowEvent)
        private cowEventRepository: Repository<CowEvent>,
        @InjectRepository(MilkRecord)
        private milkRecordRepository: Repository<MilkRecord>,
        @InjectRepository(MemberDue)
        private memberDueRepository: Repository<MemberDue>,
    ) { }

    /**
     * Get dashboard summary for a farm
     */
    async getSummary(farmId: string): Promise<DashboardSummary> {
        // Get cow counts
        const [totalHerdSize, activeCount] = await Promise.all([
            this.cowRepository.count({ where: { farmId } }),
            this.cowRepository.count({ where: { farmId, lifecycleStatus: 'active' } }),
        ]);

        // Get lactating cows (active females with milk records in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = formatDate(thirtyDaysAgo);

        const lactatingResult = await this.milkRecordRepository
            .createQueryBuilder('record')
            .innerJoin('record.cow', 'cow')
            .select('COUNT(DISTINCT cow.id)', 'count')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('record.date >= :date', { date: thirtyDaysAgoStr })
            .getRawOne();

        const lactatingCowsCount = parseInt(lactatingResult?.count || '0', 10);

        // Get pregnant cows (breeding events with confirmed pregnancy)
        const pregnantResult = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .select('COUNT(DISTINCT cow.id)', 'count')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .andWhere("event.metadata->>'result' = :result", { result: 'confirmed' })
            .getRawOne();

        const pregnantCowsCount = parseInt(pregnantResult?.count || '0', 10);

        // Get cows under treatment (health events with isUnderTreatment = true)
        const treatmentResult = await this.cowEventRepository
            .createQueryBuilder('event')
            .innerJoin('event.cow', 'cow')
            .select('COUNT(DISTINCT cow.id)', 'count')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('event.type = :type', { type: 'HEALTH' })
            .andWhere("event.metadata->>'isUnderTreatment' = :value", { value: 'true' })
            .getRawOne();

        const cowsUnderTreatmentCount = parseInt(treatmentResult?.count || '0', 10);

        // Get milk totals
        const today = formatDate(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);

        const [todayMilkResult, yesterdayMilkResult] = await Promise.all([
            this.milkRecordRepository
                .createQueryBuilder('record')
                .innerJoin('record.cow', 'cow')
                .select('SUM(record.amount)', 'total')
                .where('cow.farmId = :farmId', { farmId })
                .andWhere('record.date = :date', { date: today })
                .getRawOne(),
            this.milkRecordRepository
                .createQueryBuilder('record')
                .innerJoin('record.cow', 'cow')
                .select('SUM(record.amount)', 'total')
                .where('cow.farmId = :farmId', { farmId })
                .andWhere('record.date = :date', { date: yesterdayStr })
                .getRawOne(),
        ]);

        const todayMilkTotal = parseFloat(todayMilkResult?.total || '0');
        const yesterdayMilkTotal = parseFloat(yesterdayMilkResult?.total || '0');

        const milkChangePercent = yesterdayMilkTotal > 0
            ? Math.round(((todayMilkTotal - yesterdayMilkTotal) / yesterdayMilkTotal) * 100 * 10) / 10
            : 0;

        // Get pending reimbursements
        const reimbursementResult = await this.memberDueRepository
            .createQueryBuilder('r')
            .innerJoin('r.person', 'person')
            .select('SUM(r.amount)', 'total')
            .where('person.farmId = :farmId', { farmId })
            .andWhere('r.status = :status', { status: 'PENDING' })
            .andWhere('r.type = :type', { type: 'BUSINESS_OWES' }) // Only what business owes count as reimbursements
            .getRawOne();
        const pendingReimbursementTotal = parseFloat(reimbursementResult?.total || '0');

        return {
            totalHerdSize,
            activeCount,
            lactatingCowsCount,
            pregnantCowsCount,
            cowsUnderTreatmentCount,
            todayMilkTotal,
            yesterdayMilkTotal,
            milkChangePercent,
            pendingReimbursementTotal,
        };
    }
}
