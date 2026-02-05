import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';
import { Cow } from '../../entities/cow.entity';
import { CreateTransactionDto, TransactionFilterDto } from '../../dto/financial';
import { getPagination, createPaginatedResult, PaginatedResult } from '../../common/utils/pagination.utils';
import { isFutureDate, formatDate, startOfMonth, endOfMonth } from '../../common/utils/date.utils';

@Injectable()
export class FinancialService {
    constructor(
        @InjectRepository(FinancialTransaction)
        private transactionRepository: Repository<FinancialTransaction>,
        @InjectRepository(Cow)
        private cowRepository: Repository<Cow>,
    ) { }

    /**
     * Create a financial transaction
     */
    async create(farmId: string, createDto: CreateTransactionDto, userId: string): Promise<FinancialTransaction> {
        // Validate date
        if (isFutureDate(createDto.date)) {
            throw new BadRequestException('Transaction date cannot be in the future');
        }

        // Validate cow if provided
        if (createDto.cowId) {
            const cow = await this.cowRepository.findOne({
                where: { id: createDto.cowId, farmId },
            });
            if (!cow) {
                throw new NotFoundException('Cow not found in this farm');
            }
        }

        const transaction = this.transactionRepository.create({
            ...createDto,
            farmId,
            date: new Date(createDto.date),
            createdBy: userId,
        });

        return this.transactionRepository.save(transaction);
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

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

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

        if (updateDto.cowId) {
            const cow = await this.cowRepository.findOne({
                where: { id: updateDto.cowId, farmId },
            });
            if (!cow) {
                throw new NotFoundException('Cow not found in this farm');
            }
        }

        Object.assign(transaction, updateDto);
        if (updateDto.date) {
            transaction.date = new Date(updateDto.date);
        }

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
    ): Promise<{
        totalIncome: number;
        totalExpenses: number;
        netProfitLoss: number;
    }> {
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

        const totalIncome = parseFloat(incomeResult?.total || '0');
        const totalExpenses = parseFloat(expenseResult?.total || '0');

        return {
            totalIncome,
            totalExpenses,
            netProfitLoss: totalIncome - totalExpenses,
        };
    }

    /**
     * Get expense breakdown by category
     */
    async getExpenseBreakdown(
        farmId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<Array<{ category: string; amount: number }>> {
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1); // Default to start of year
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
     * Get monthly financial trends for reports
     */
    async getMonthlyTrends(
        farmId: string,
        startDate?: string,
        endDate?: string,
    ): Promise<Array<{ month: string; income: number; expenses: number; profit: number }>> {
        // Default to last 6 months if not provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 5, 1);

        const records = await this.transactionRepository
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

        return records.map(r => ({
            month: r.month,
            income: parseFloat(r.income || '0'),
            expenses: parseFloat(r.expenses || '0'),
            profit: parseFloat(r.income || '0') - parseFloat(r.expenses || '0'),
        }));
    }
}
