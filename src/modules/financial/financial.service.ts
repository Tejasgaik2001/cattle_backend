import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransaction, Cow, Person, MemberDueType, MilkRecord } from '../../entities';
import { CreateTransactionDto, TransactionFilterDto } from '../../dto/financial';
import { getPagination, createPaginatedResult, PaginatedResult } from '../../common/utils/pagination.utils';
import { isFutureDate, formatDate, startOfMonth, endOfMonth } from '../../common/utils/date.utils';
import { MemberDueService } from './member-due.service';
import { MilkRecordsService } from '../milk-records/milk-records.service';


@Injectable()
export class FinancialService {
    constructor(
        @InjectRepository(FinancialTransaction)
        private transactionRepository: Repository<FinancialTransaction>,
        @InjectRepository(Cow)
        private cowRepository: Repository<Cow>,
        @InjectRepository(Person)
        private personRepository: Repository<Person>,
        private memberDueService: MemberDueService,
        private milkRecordsService: MilkRecordsService,
    ) {}

    /**
     * Create a financial transaction
     */
    async create(farmId: string, createDto: CreateTransactionDto, userId: string): Promise<FinancialTransaction> {
        if (isFutureDate(createDto.date)) {
            throw new BadRequestException('Transaction date cannot be in the future');
        }

        if (createDto.cowId) {
            const cow = await this.cowRepository.findOne({
                where: { id: createDto.cowId, farmId },
            });
            if (!cow) throw new NotFoundException('Cow not found in this farm');
        }

        if (createDto.paidById) {
            // paidById can be either a Person or User ID
            // Try to find as Person first, then as User
            const person = await this.personRepository.findOne({
                where: { id: createDto.paidById, farmId },
            });
            if (!person) {
                // If not a person, check if it's a valid user
                // We'll store the user ID directly in paidById for users
            }
        }

        const transaction = this.transactionRepository.create({
            ...createDto,
            farmId,
            date: new Date(createDto.date),
            createdBy: userId,
        });

        const savedTransaction = await this.transactionRepository.save(transaction);

        // If a person is involved (paid/received personally), create a member due entry
        if (createDto.paidById) {
            const person = await this.personRepository.findOne({
                where: { id: createDto.paidById, farmId },
            });
            if (person) {
                await this.memberDueService.create({
                    personId: createDto.paidById,
                    transactionId: savedTransaction.id,
                    amount: Number(savedTransaction.amount),
                    // If expense: person paid for business → business owes person
                    // If income: person received income → person owes business
                    type: savedTransaction.type === 'expense' ? MemberDueType.BUSINESS_OWES : MemberDueType.OWES_BUSINESS,
                    note: `Automatically created from ${savedTransaction.category} ${savedTransaction.type}`
                });
            } else {
                // If not a person, treat as user ID
                await this.memberDueService.create({
                    userId: createDto.paidById,
                    transactionId: savedTransaction.id,
                    amount: Number(savedTransaction.amount),
                    type: savedTransaction.type === 'expense' ? MemberDueType.BUSINESS_OWES : MemberDueType.OWES_BUSINESS,
                    note: `Automatically created from ${savedTransaction.category} ${savedTransaction.type}`
                });
            }
        }

        return savedTransaction;
    }

    /**
     * Get transactions with filters
     */
    async findAll(farmId: string, filterDto: TransactionFilterDto): Promise<PaginatedResult<FinancialTransaction>> {
        const { skip, take } = getPagination(filterDto);

        const queryBuilder = this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoin('transaction.cow', 'cow')
            .addSelect(['cow.id', 'cow.tagId', 'cow.name'])
            .where('transaction.farmId = :farmId', { farmId });

        if (filterDto.type) {
            queryBuilder.andWhere('transaction.type = :type', { type: filterDto.type });
        }
        if (filterDto.category) {
            queryBuilder.andWhere('transaction.category = :category', { category: filterDto.category });
        }
        if (filterDto.startDate) {
            queryBuilder.andWhere('transaction.date >= :startDate', { startDate: filterDto.startDate });
        }
        if (filterDto.endDate) {
            queryBuilder.andWhere('transaction.date <= :endDate', { endDate: filterDto.endDate });
        }

        queryBuilder.orderBy('transaction.date', 'DESC').addOrderBy('transaction.createdAt', 'DESC');

        const total = await queryBuilder.getCount();
        const transactions = await queryBuilder.skip(skip).take(take).getMany();

        return createPaginatedResult(transactions, total, filterDto);
    }

    /**
     * Get a single transaction
     */
    async findOne(farmId: string, transactionId: string): Promise<FinancialTransaction> {
        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId, farmId },
            relations: ['cow'],
        });
        if (!transaction) throw new NotFoundException('Transaction not found');
        return transaction;
    }

    /**
     * Update a transaction
     */
    async update(
        farmId: string,
        transactionId: string,
        updateDto: Partial<CreateTransactionDto>,
    ): Promise<FinancialTransaction> {
        const transaction = await this.findOne(farmId, transactionId);

        if (updateDto.date && isFutureDate(updateDto.date)) {
            throw new BadRequestException('Transaction date cannot be in the future');
        }

        Object.assign(transaction, updateDto);
        if (updateDto.date) transaction.date = new Date(updateDto.date);

        return this.transactionRepository.save(transaction);
    }

    /**
     * Delete a transaction
     */
    async remove(farmId: string, transactionId: string): Promise<void> {
        const transaction = await this.findOne(farmId, transactionId);
        await this.transactionRepository.remove(transaction);
    }

    /**
     * Get financial overview for a period
     */
    async getOverview(
        farmId: string,
        startDate: string,
        endDate: string,
    ): Promise<{ totalIncome: number; totalExpenses: number; netProfitLoss: number }> {
        const incomeResult = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.farmId = :farmId', { farmId })
            .andWhere('transaction.type = :type', { type: 'income' })
            .andWhere('transaction.date >= :startDate', { startDate })
            .andWhere('transaction.date <= :endDate', { endDate })
            .getRawOne();

        const expenseResult = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where('transaction.farmId = :farmId', { farmId })
            .andWhere('transaction.type = :type', { type: 'expense' })
            .andWhere('transaction.date >= :startDate', { startDate })
            .andWhere('transaction.date <= :endDate', { endDate })
            .getRawOne();

        // Include milk income
        const milkIncome = await this.milkRecordsService.getPeriodValue(farmId, startDate, endDate);
        
        const totalIncome = parseFloat(incomeResult?.total || '0') + milkIncome;
        const totalExpenses = parseFloat(expenseResult?.total || '0');

        return { totalIncome, totalExpenses, netProfitLoss: totalIncome - totalExpenses };
    }

    /**
     * Get expense breakdown by category
     */
    async getExpenseBreakdown(
        farmId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<Array<{ category: string; amount: number }>> {
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date();

        const results = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('transaction.category', 'category')
            .addSelect('SUM(transaction.amount)', 'amount')
            .where('transaction.farmId = :farmId', { farmId })
            .andWhere('transaction.type = :type', { type: 'expense' })
            .andWhere('transaction.date >= :startDate', { startDate: start })
            .andWhere('transaction.date <= :endDate', { endDate: end })
            .groupBy('transaction.category')
            .orderBy('amount', 'DESC')
            .getRawMany();

        return results.map((r) => ({
            category: r.category,
            amount: parseFloat(r.amount || '0'),
        }));
    }

    /**
     * Get income breakdown by category
     */
    async getIncomeBreakdown(
        farmId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<Array<{ category: string; amount: number }>> {
        const start = startDate ? new Date(startDate) : startOfMonth(new Date());
        const end = endDate ? new Date(endDate) : endOfMonth(new Date());

        const results = await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('transaction.category', 'category')
            .addSelect('SUM(transaction.amount)', 'amount')
            .where('transaction.farmId = :farmId', { farmId })
            .andWhere('transaction.type = :type', { type: 'income' })
            .andWhere('transaction.date >= :startDate', { startDate: start })
            .andWhere('transaction.date <= :endDate', { endDate: end })
            .groupBy('transaction.category')
            .orderBy('amount', 'DESC')
            .getRawMany();

        const formattedResults = results.map((r) => ({
            category: r.category,
            amount: parseFloat(r.amount || '0'),
        }));

        // Add Milk Production income
        const milkIncome = await this.milkRecordsService.getPeriodValue(farmId, formatDate(start), formatDate(end));
        
        if (milkIncome > 0) {
            formattedResults.push({
                category: 'Milk Production',
                amount: milkIncome
            });
            // Sort again after adding milk
            formattedResults.sort((a, b) => b.amount - a.amount);
        }

        return formattedResults;
    }

    /**
     * Get current month overview
     */
    async getCurrentMonthOverview(farmId: string): Promise<{
        totalIncome: number;
        totalExpenses: number;
        netProfitLoss: number;
        period: string;
    }> {
        const now = new Date();
        const startDate = formatDate(startOfMonth(now));
        const endDate = formatDate(endOfMonth(now));
        const overview = await this.getOverview(farmId, startDate, endDate);

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];

        return {
            ...overview,
            period: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
        };
    }

    /**
     * Full monthly summary with category breakdown, income breakdown,
     * and member dues.
     */
    async getMonthlySummary(farmId: string, year?: number, month?: number): Promise<{
        period: string;
        totalIncome: number;
        totalExpenses: number;
        netBalance: number;
        expenseByCategory: Array<{ category: string; amount: number; percentage: number }>;
        incomeByCategory: Array<{ category: string; amount: number; percentage: number }>;
        recentTransactions: FinancialTransaction[];
        spendingByPerson: any[];
    }> {
        const now = new Date();
        const targetYear = year ?? now.getFullYear();
        const targetMonth = month !== undefined ? month : now.getMonth();

        const periodStart = new Date(targetYear, targetMonth, 1);
        const periodEnd = new Date(targetYear, targetMonth + 1, 0);
        const startDate = formatDate(periodStart);
        const endDate = formatDate(periodEnd);

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];
        const period = `${monthNames[targetMonth]} ${targetYear}`;

        const [overview, expenseBreakdown, incomeBreakdown, recentTransactions, spendingByPerson] =
            await Promise.all([
                this.getOverview(farmId, startDate, endDate),
                this.getExpenseBreakdown(farmId, startDate, endDate),
                this.getIncomeBreakdown(farmId, startDate, endDate),
                this.transactionRepository.find({
                    where: { farmId },
                    relations: ['cow'],
                    order: { date: 'DESC', createdAt: 'DESC' },
                    take: 10,
                }),
                this.memberDueService.getPendingSummaryByPerson(farmId),
            ]);

        const totalExp = overview.totalExpenses;
        const totalInc = overview.totalIncome;

        const expenseByCategory = expenseBreakdown.map((e) => ({
            ...e,
            percentage: totalExp > 0 ? Math.round((e.amount / totalExp) * 100) : 0,
        }));

        const incomeByCategory = incomeBreakdown.map((e) => ({
            ...e,
            percentage: totalInc > 0 ? Math.round((e.amount / totalInc) * 100) : 0,
        }));

        return {
            period,
            totalIncome: overview.totalIncome,
            totalExpenses: overview.totalExpenses,
            netBalance: overview.netProfitLoss,
            expenseByCategory,
            incomeByCategory,
            recentTransactions,
            spendingByPerson,
        };
    }

    /**
     * Today's income and expense totals
     */
    async getTodaySummary(farmId: string): Promise<{ todayIncome: number; todayExpense: number }> {
        const today = formatDate(new Date());

        const [incomeResult, expenseResult] = await Promise.all([
            this.transactionRepository
                .createQueryBuilder('tx')
                .select('SUM(tx.amount)', 'total')
                .where('tx.farmId = :farmId', { farmId })
                .andWhere('tx.type = :type', { type: 'income' })
                .andWhere('tx.date = :today', { today })
                .getRawOne(),
            this.transactionRepository
                .createQueryBuilder('tx')
                .select('SUM(tx.amount)', 'total')
                .where('tx.farmId = :farmId', { farmId })
                .andWhere('tx.type = :type', { type: 'expense' })
                .andWhere('tx.date = :today', { today })
                .getRawOne(),
        ]);

        return {
            todayIncome: parseFloat(incomeResult?.total || '0'),
            todayExpense: parseFloat(expenseResult?.total || '0'),
        };
    }

    /**
     * Last 7 days daily income/expense trend
     */
    async getLast7DaysTrend(farmId: string): Promise<Array<{ date: string; income: number; expense: number }>> {
        const days: Array<{ date: string; income: number; expense: number }> = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = formatDate(d);
            const [inc, exp, milkInc] = await Promise.all([
                this.transactionRepository
                    .createQueryBuilder('tx')
                    .select('COALESCE(SUM(tx.amount), 0)', 'total')
                    .where('tx.farmId = :farmId', { farmId })
                    .andWhere('tx.type = :type', { type: 'income' })
                    .andWhere('tx.date = :date', { date: dateStr })
                    .getRawOne(),
                this.transactionRepository
                    .createQueryBuilder('tx')
                    .select('COALESCE(SUM(tx.amount), 0)', 'total')
                    .where('tx.farmId = :farmId', { farmId })
                    .andWhere('tx.type = :type', { type: 'expense' })
                    .andWhere('tx.date = :date', { date: dateStr })
                    .getRawOne(),
                this.milkRecordsService.getPeriodValue(farmId, dateStr, dateStr),
            ]);
            days.push({
                date: dateStr,
                income: parseFloat(inc?.total || '0') + milkInc,
                expense: parseFloat(exp?.total || '0'),
            });
        }
        return days;
    }

    /**
     * Get monthly financial trends for reports
     */
    async getMonthlyTrends(
        farmId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<Array<{ month: string; income: number; expenses: number; profit: number }>> {
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 5, 1);

        const txRecords = await this.transactionRepository
            .createQueryBuilder('tx')
            .select("TO_CHAR(tx.date, 'Mon YYYY')", 'month')
            .addSelect("TO_CHAR(tx.date, 'YYYY-MM')", 'yearMonth')
            .addSelect(
                "SUM(CASE WHEN tx.type = 'income' THEN tx.amount ELSE 0 END)",
                'income'
            )
            .addSelect(
                "SUM(CASE WHEN tx.type = 'expense' THEN tx.amount ELSE 0 END)",
                'expenses'
            )
            .where('tx.farmId = :farmId', { farmId })
            .andWhere('tx.date >= :startDate', { startDate: start })
            .andWhere('tx.date <= :endDate', { endDate: end })
            .groupBy("TO_CHAR(tx.date, 'Mon YYYY')")
            .addGroupBy("TO_CHAR(tx.date, 'YYYY-MM')")
            .orderBy("TO_CHAR(tx.date, 'YYYY-MM')", 'ASC')
            .getRawMany();

        // Get milk income monthly trends
        const milkMonthly = await this.milkRecordsService.getMonthlyIncomeTrends(farmId, start, end);

        // Map milk income for easy lookup
        const milkMap = new Map<string, number>();
        milkMonthly.forEach((m) => {
            milkMap.set(m.yearMonth, m.totalIncome);
        });

        // Merge records
        const results = txRecords.map((r) => {
            const milkIncome = milkMap.get(r.yearMonth) || 0;
            const totalInc = parseFloat(r.income || '0') + milkIncome;
            const totalExp = parseFloat(r.expenses || '0');
            return {
                month: r.month,
                income: totalInc,
                expenses: totalExp,
                profit: totalInc - totalExp,
                yearMonth: r.yearMonth // temporarily keep for merging
            };
        });

        // Add any months that have milk income but no transactions
        milkMonthly.forEach(m => {
            if (!results.find(r => (r as any).yearMonth === m.yearMonth)) {
                const milkIncome = m.totalIncome;
                results.push({
                    month: m.month,
                    income: milkIncome,
                    expenses: 0,
                    profit: milkIncome,
                    yearMonth: m.yearMonth
                } as any);
            }
        });

        // Final sort and cleanup
        return results
            .sort((a, b) => (a as any).yearMonth.localeCompare((b as any).yearMonth))
            .map(({ yearMonth, ...rest }) => rest);
    }
}
