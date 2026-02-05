import { Injectable } from '@nestjs/common';
import { MilkRecordsService } from '../milk-records/milk-records.service';
import { FinancialService } from './financial.service';
import { formatDate, startOfMonth, endOfMonth } from '../../common/utils/date.utils';

@Injectable()
export class ProductionFinanceService {
    constructor(
        private readonly milkRecordsService: MilkRecordsService,
        private readonly financialService: FinancialService,
    ) { }

    /**
     * Get aggregated production and finance overview
     */
    async getOverview(farmId: string, startDate?: string, endDate?: string) {
        const now = new Date();
        const start = startDate || formatDate(startOfMonth(now));
        const end = endDate || formatDate(endOfMonth(now));

        const [milkTotal, financialOverview] = await Promise.all([
            this.milkRecordsService.getPeriodTotal(farmId, start, end),
            this.financialService.getOverview(farmId, start, end),
        ]);

        // Get period label
        let periodLabel = `${start} to ${end}`;
        if (!startDate && !endDate) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
            ];
            periodLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        }

        return {
            totalMilkProduction: milkTotal,
            totalIncome: financialOverview.totalIncome,
            totalExpenses: financialOverview.totalExpenses,
            netProfitLoss: financialOverview.netProfitLoss,
            currentPeriod: periodLabel,
        };
    }

    /**
     * Get operational insights (top/low producers and expense breakdown)
     */
    async getOperationalInsights(farmId: string, startDate?: string, endDate?: string) {
        const now = new Date();
        const start = startDate || formatDate(startOfMonth(now));
        const end = endDate || formatDate(endOfMonth(now));

        const [topProducers, lowProducers, expenseBreakdown] = await Promise.all([
            this.milkRecordsService.getTopProducers(farmId, start, end),
            this.milkRecordsService.getLowProducers(farmId, start, end),
            this.financialService.getExpenseBreakdown(farmId, start, end),
        ]);

        return {
            topProducingCows: topProducers.map(p => ({
                cowId: p.cowId,
                tagId: p.tagId,
                name: p.name,
                avgDailyMilk: p.avgDaily,
            })),
            lowProducingCows: lowProducers.map(p => ({
                cowId: p.cowId,
                tagId: p.tagId,
                name: p.name,
                avgDailyMilk: p.avgDaily,
            })),
            highestExpenseCategories: expenseBreakdown.map(e => ({
                categoryName: e.category,
                totalAmount: e.amount,
            })),
        };
    }
}
