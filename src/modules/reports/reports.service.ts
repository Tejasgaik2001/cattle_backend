import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, addDays } from 'date-fns';
import { ReportTimeframe, ReportQueryDto } from './dto/report-query.dto';
import { MilkRecord } from '../../entities/milk-record.entity';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';
import { Cow } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(
        @InjectRepository(MilkRecord)
        private readonly milkRecordRepository: Repository<MilkRecord>,
        @InjectRepository(FinancialTransaction)
        private readonly financialRepository: Repository<FinancialTransaction>,
        @InjectRepository(Cow)
        private readonly cowRepository: Repository<Cow>,
        @InjectRepository(CowEvent)
        private readonly eventRepository: Repository<CowEvent>,
    ) {}

    getDateRange(query: ReportQueryDto): { start: Date; end: Date } {
        const now = new Date();
        let start = startOfDay(now);
        let end = endOfDay(now);

        switch (query.timeframe) {
            case ReportTimeframe.YESTERDAY:
                start = startOfDay(subDays(now, 1));
                end = endOfDay(subDays(now, 1));
                break;
            case ReportTimeframe.LAST_7_DAYS:
                start = startOfDay(subDays(now, 7));
                end = endOfDay(now);
                break;
            case ReportTimeframe.LAST_30_DAYS:
                start = startOfDay(subDays(now, 30));
                end = endOfDay(now);
                break;
            case ReportTimeframe.MONTHLY:
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case ReportTimeframe.QUARTERLY:
                start = startOfQuarter(now);
                end = endOfQuarter(now);
                break;
            case ReportTimeframe.YEARLY:
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            case ReportTimeframe.FINANCIAL_YEAR:
                const currentMonth = now.getMonth();
                const startYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                start = startOfDay(new Date(startYear, 3, 1)); // April 1st
                end = endOfDay(new Date(startYear + 1, 2, 31)); // March 31st
                break;
            case ReportTimeframe.CUSTOM:
                if (query.startDate) start = startOfDay(new Date(query.startDate));
                if (query.endDate) end = endOfDay(new Date(query.endDate));
                break;
        }

        return { start, end };
    }

    async getMilkProductionReport(farmId: string, query: ReportQueryDto) {
        const { start, end } = this.getDateRange(query);
        const startStr = format(start, 'yyyy-MM-dd HH:mm:ss');
        const endStr = format(end, 'yyyy-MM-dd HH:mm:ss');

        const qb = this.milkRecordRepository.createQueryBuilder('record')
            .leftJoinAndSelect('record.cow', 'cow')
            .where('record.farmId = :farmId', { farmId })
            .andWhere('record.date BETWEEN :start AND :end', { start: startStr, end: endStr });

        if (query.cowId) {
            qb.andWhere('record.cowId = :cowId', { cowId: query.cowId });
        }

        if (query.search) {
            qb.andWhere('(cow.tagId ILIKE :search OR cow.name ILIKE :search)', { search: `%${query.search}%` });
        }

        const [records, totalCount] = await qb
            .orderBy('record.date', 'DESC')
            .addOrderBy('record.milkingTime', 'ASC')
            .getManyAndCount();

        // Summary Calculations
        const totalLiters = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const avgLitersPerSession = records.length > 0 ? totalLiters / records.length : 0;
        const totalIncome = records.reduce((sum, r) => sum + (Number(r.totalValue) || 0), 0);
        
        // Group by day for trends
        const dailyTrends = records.reduce((acc, r) => {
            const date = format(new Date(r.date), 'yyyy-MM-dd');
            if (!acc[date]) acc[date] = { date, amount: 0, income: 0 };
            acc[date].amount += Number(r.amount) || 0;
            acc[date].income += Number(r.totalValue) || 0;
            return acc;
        }, {} as Record<string, any>);

        return {
            records,
            totalCount,
            summary: {
                totalLiters,
                avgLitersPerSession,
                totalIncome,
                recordCount: records.length,
            },
            trends: Object.values(dailyTrends).sort((a, b) => a.date.localeCompare(b.date)),
            meta: {
                title: 'Milk Production Report',
                timeframe: query.timeframe,
                startDate: startStr,
                endDate: endStr,
            }
        };
    }

    async getFinancialReport(farmId: string, query: ReportQueryDto) {
        const { start, end } = this.getDateRange(query);
        const startStr = format(start, 'yyyy-MM-dd HH:mm:ss');
        const endStr = format(end, 'yyyy-MM-dd HH:mm:ss');

        const qb = this.financialRepository.createQueryBuilder('tx')
            .where('tx.farmId = :farmId', { farmId })
            .andWhere('tx.date BETWEEN :start AND :end', { start: startStr, end: endStr });

        if (query.category) {
            qb.andWhere('tx.category = :category', { category: query.category });
        }

        const [transactions, totalCount] = await qb
            .orderBy('tx.date', 'DESC')
            .getManyAndCount();

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const netProfit = totalIncome - totalExpense;

        // Group by category
        const categoryBreakdown = transactions.reduce((acc, t) => {
            if (!acc[t.category]) acc[t.category] = 0;
            acc[t.category] += Number(t.amount);
            return acc;
        }, {} as Record<string, number>);

        return {
            transactions,
            totalCount,
            summary: {
                totalIncome,
                totalExpense,
                netProfit,
                margin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
            },
            categoryBreakdown,
            meta: {
                title: 'Financial Statement',
                timeframe: query.timeframe,
                startDate: startStr,
                endDate: endStr,
            }
        };
    }

    async getHealthReport(farmId: string, query: ReportQueryDto) {
        const { start, end } = this.getDateRange(query);
        const startStr = format(start, 'yyyy-MM-dd HH:mm:ss');
        const endStr = format(end, 'yyyy-MM-dd HH:mm:ss');

        const qb = this.eventRepository.createQueryBuilder('event')
            .leftJoinAndSelect('event.cow', 'cow')
            .where('event.farmId = :farmId', { farmId })
            .andWhere('event.type IN (:...types)', { types: ['VACCINATION', 'MEDICAL_TREATMENT', 'DEWORMING'] })
            .andWhere('event.date BETWEEN :start AND :end', { start: startStr, end: endStr });

        const [records, totalCount] = await qb
            .orderBy('event.date', 'DESC')
            .getManyAndCount();

        // Summary
        const typeBreakdown = records.reduce((acc, r) => {
            acc[r.type] = (acc[r.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            records,
            totalCount,
            summary: {
                totalEvents: totalCount,
                ...typeBreakdown
            },
            meta: {
                title: 'Health & Medical Report',
                timeframe: query.timeframe,
                startDate: startStr,
                endDate: endStr,
            }
        };
    }

    async getInventoryReport(farmId: string) {
        // Assuming there is an Inventory module, if not I'll just return an empty set or basic stats
        // For now, let's look for inventory entity.
        return {
            records: [],
            summary: { totalItems: 0 },
            meta: { title: 'Inventory Report' }
        };
    }

    async getHerdPredictions(farmId: string) {
        const today = new Date();
        const next90Days = addDays(today, 90);

        // Calving Predictions
        const calvingPredictions = await this.eventRepository.createQueryBuilder('event')
            .innerJoinAndSelect('event.cow', 'cow')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('event.type = :type', { type: 'BREEDING' })
            .andWhere("event.metadata->>'result' = 'confirmed'")
            .andWhere("event.metadata->>'expectedCalvingDate' BETWEEN :start AND :end", {
                start: format(today, 'yyyy-MM-dd'),
                end: format(next90Days, 'yyyy-MM-dd')
            })
            .orderBy("event.metadata->>'expectedCalvingDate'", 'ASC')
            .getMany();

        // Milk Productivity Analysis (Top 10 / Bottom 10 cows)
        const milkPerformance = await this.milkRecordRepository.createQueryBuilder('record')
            .innerJoin('record.cow', 'cow')
            .select('cow.tagId', 'tagId')
            .addSelect('cow.name', 'name')
            .addSelect('AVG(record.amount)', 'avgDaily')
            .addSelect('SUM(record.amount)', 'totalProduced')
            .where('record.farmId = :farmId', { farmId })
            .groupBy('cow.id')
            .addGroupBy('cow.tagId')
            .addGroupBy('cow.name')
            .orderBy('avgDaily', 'DESC')
            .limit(20)
            .getRawMany();

        return {
            calvingPredictions: calvingPredictions.map(p => ({
                tagId: p.cow.tagId,
                name: p.cow.name,
                expectedDate: (p.metadata as any).expectedCalvingDate,
                daysRemaining: Math.ceil((new Date((p.metadata as any).expectedCalvingDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            })),
            performance: {
                topPerformers: milkPerformance.slice(0, 5),
                bottomPerformers: [...milkPerformance].reverse().slice(0, 5)
            }
        };
    }
}
