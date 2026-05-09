import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';

import { MilkRecord } from '../../entities/milk-record.entity';
import { Cow } from '../../entities/cow.entity';
import {
    CreateMilkRecordDto,
    BulkMilkRecordDto,
    UpdateMilkRecordDto,
    MilkRecordFilterDto,
} from '../../dto/milk-record';

import { getPagination, createPaginatedResult, PaginatedResult } from '../../common/utils/pagination.utils';
import { isFutureDate, formatDate, startOfMonth, endOfMonth } from '../../common/utils/date.utils';

@Injectable()
export class MilkRecordsService {
    constructor(
        @InjectRepository(MilkRecord)
        private milkRecordRepository: Repository<MilkRecord>,
        @InjectRepository(Cow)
        private cowRepository: Repository<Cow>,
    ) { }

    /**
     * Create a single milk record
     */
    async create(farmId: string, createDto: CreateMilkRecordDto, userId: string): Promise<MilkRecord> {
        // Validate date is not in the future
        if (isFutureDate(createDto.date)) {
            throw new BadRequestException('Record date cannot be in the future');
        }

        if (createDto.cowId) {
            // Verify cow exists and belongs to farm
            const cow = await this.cowRepository.findOne({
                where: { id: createDto.cowId, farmId },
            });

            if (!cow) {
                throw new NotFoundException('Cow not found in this farm');
            }

            if (cow.gender !== 'female') {
                throw new BadRequestException('Only female cows can have milk records');
            }

            // Check for duplicate individual record
            const existing = await this.milkRecordRepository.findOne({
                where: {
                    cowId: createDto.cowId,
                    date: new Date(createDto.date),
                    milkingTime: createDto.milkingTime,
                },
            });

            if (existing) {
                throw new ConflictException(
                    `Milk record already exists for this cow on ${createDto.date} (${createDto.milkingTime})`,
                );
            }
        } else {
            // It's a bulk record
            // Check for duplicate bulk record for the farm/date/time
            const existingBulk = await this.milkRecordRepository.findOne({
                where: {
                    cowId: IsNull(),
                    farmId,
                    date: new Date(createDto.date),
                    milkingTime: createDto.milkingTime,
                },
            });

            if (existingBulk) {
                throw new ConflictException(
                    `Bulk milk record already exists for this farm on ${createDto.date} (${createDto.milkingTime})`,
                );
            }
        }

        const record = this.milkRecordRepository.create({
            cowId: createDto.cowId || null,
            farmId,
            date: new Date(createDto.date),
            milkingTime: createDto.milkingTime,
            amount: createDto.amount,
            isBulk: createDto.isBulk || !createDto.cowId,
            pricePerLiter: createDto.pricePerLiter || null,
            fat: createDto.fat || null,
            snf: createDto.snf || null,
            totalValue: createDto.pricePerLiter ? createDto.amount * createDto.pricePerLiter : null,
            notes: createDto.notes || null,
            createdBy: userId,
        });

        return this.milkRecordRepository.save(record);

    }


    /**
     * Create bulk milk records
     */
    async createBulk(farmId: string, bulkDto: BulkMilkRecordDto, userId: string): Promise<MilkRecord[]> {
        const savedRecords: MilkRecord[] = [];
        const errors: string[] = [];

        for (const recordDto of bulkDto.records) {
            try {
                const record = await this.create(farmId, recordDto, userId);
                savedRecords.push(record);
            } catch (error) {
                if (error instanceof ConflictException) {
                    // Update existing record instead of failing
                    const existing = await this.milkRecordRepository.findOne({
                        where: {
                            cowId: recordDto.cowId ? recordDto.cowId : IsNull(),
                            farmId,
                            date: new Date(recordDto.date),
                            milkingTime: recordDto.milkingTime,
                        },
                    });
                    if (existing) {
                        existing.amount = recordDto.amount;
                        existing.pricePerLiter = recordDto.pricePerLiter || existing.pricePerLiter;
                        existing.fat = recordDto.fat || existing.fat;
                        existing.snf = recordDto.snf || existing.snf;
                        existing.totalValue = existing.pricePerLiter ? existing.amount * existing.pricePerLiter : null;
                        existing.notes = recordDto.notes || existing.notes;
                        const updated = await this.milkRecordRepository.save(existing);
                        savedRecords.push(updated);
                    } else {
                        errors.push(`Failed to update record for ${recordDto.cowId ? 'cow ' + recordDto.cowId : 'bulk'}: ${error.message}`);
                    }
                } else {
                    errors.push(`Failed to save record for cow ${recordDto.cowId}: ${error.message}`);
                }
            }
        }

        if (errors.length > 0 && savedRecords.length === 0) {
            throw new BadRequestException(errors.join('; '));
        }

        return savedRecords;
    }

    /**
     * Update a milk record (useful for reconciliation)
     */
    async update(farmId: string, id: string, updateDto: UpdateMilkRecordDto): Promise<MilkRecord> {
        const record = await this.milkRecordRepository.findOne({
            where: { id, farmId },
        });

        if (!record) {
            throw new NotFoundException('Milk record not found');
        }

        // Update fields
        Object.assign(record, updateDto);

        // Recalculate total value
        // Use dairy price if available, else farm price
        const price = record.dairyPricePerLiter || record.pricePerLiter;
        const amount = record.dairyAmount || record.amount;

        if (price && amount) {
            record.totalValue = price * amount;
        }

        return this.milkRecordRepository.save(record);
    }

    /**
     * Get all milk records with pagination and filters
     */
    async findAll(farmId: string, filterDto: MilkRecordFilterDto): Promise<PaginatedResult<MilkRecord>> {
        const { skip, take } = getPagination(filterDto);

        const queryBuilder = this.milkRecordRepository
            .createQueryBuilder('record')
            .leftJoin('record.cow', 'cow')
            .addSelect(['cow.id', 'cow.tagId', 'cow.name'])
            .where('record.farmId = :farmId', { farmId });

        if (filterDto.cowId) {
            queryBuilder.andWhere('record.cowId = :cowId', { cowId: filterDto.cowId });
        }


        if (filterDto.startDate) {
            queryBuilder.andWhere('record.date >= :startDate', { startDate: filterDto.startDate });
        }

        if (filterDto.endDate) {
            queryBuilder.andWhere('record.date <= :endDate', { endDate: filterDto.endDate });
        }

        if (filterDto.milkingTime) {
            queryBuilder.andWhere('record.milkingTime = :milkingTime', {
                milkingTime: filterDto.milkingTime,
            });
        }

        queryBuilder.orderBy('record.date', 'DESC').addOrderBy('record.milkingTime', 'ASC');

        const total = await queryBuilder.getCount();
        const records = await queryBuilder.skip(skip).take(take).getMany();

        return createPaginatedResult(records, total, filterDto);
    }

    /**
     * Get a single milk record
     */
    async findOne(farmId: string, recordId: string): Promise<MilkRecord> {
        const record = await this.milkRecordRepository
            .createQueryBuilder('record')
            .innerJoin('record.cow', 'cow')
            .addSelect(['cow.id', 'cow.tagId', 'cow.name'])
            .where('record.id = :recordId', { recordId })
            .andWhere('cow.farmId = :farmId', { farmId })
            .getOne();

        if (!record) {
            throw new NotFoundException('Milk record not found');
        }

        return record;
    }

    /**
     * Update a milk record
     */
    // Method removed - functionality consolidated into update(farmId, id, updateDto)


    /**
     * Delete a milk record
     */
    async remove(farmId: string, recordId: string): Promise<void> {
        const record = await this.findOne(farmId, recordId);
        await this.milkRecordRepository.remove(record);
    }

    /**
     * Get today's total milk production
     */
    async getTodayTotal(farmId: string): Promise<number> {
        const today = formatDate(new Date());

        const result = await this.milkRecordRepository
            .createQueryBuilder('record')
            .select('SUM(record.amount)', 'total')
            .where('record.farmId = :farmId', { farmId })
            .andWhere('record.date = :today', { today })
            .getRawOne();

        return parseFloat(result?.total || '0');
    }


    /**
     * Get yesterday's total milk production
     */
    async getYesterdayTotal(farmId: string): Promise<number> {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);

        const result = await this.milkRecordRepository
            .createQueryBuilder('record')
            .select('SUM(record.amount)', 'total')
            .where('record.farmId = :farmId', { farmId })
            .andWhere('record.date = :yesterday', { yesterday: yesterdayStr })
            .getRawOne();

        return parseFloat(result?.total || '0');
    }


    /**
     * Get total milk production value for a period
     */
    async getPeriodValue(farmId: string, startDate: string | Date, endDate: string | Date): Promise<number> {
        const result = await this.milkRecordRepository
            .createQueryBuilder('record')
            .select('SUM(record.totalValue)', 'total')
            .where('record.farmId = :farmId', { farmId })
            .andWhere('record.date >= :startDate', { startDate })
            .andWhere('record.date <= :endDate', { endDate })
            .getRawOne();

        return parseFloat(result?.total || '0');
    }

    /**
     * Get total milk production for a period
     */
    async getPeriodTotal(farmId: string, startDate: string | Date, endDate: string | Date): Promise<number> {
        const result = await this.milkRecordRepository
            .createQueryBuilder('record')
            .select('SUM(record.amount)', 'total')
            .where('record.farmId = :farmId', { farmId })
            .andWhere('record.date >= :startDate', { startDate })
            .andWhere('record.date <= :endDate', { endDate })
            .getRawOne();

        return parseFloat(result?.total || '0');
    }


    /**
     * Get top producing cows for a period
     */
    async getTopProducers(
        farmId: string,
        startDate: string,
        endDate: string,
        limit: number = 5,
    ): Promise<Array<{ cowId: string; tagId: string; name: string | null; total: number; avgDaily: number }>> {
        const daysDiff = Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

        const results = await this.milkRecordRepository
            .createQueryBuilder('record')
            .innerJoin('record.cow', 'cow')
            .select('cow.id', 'cowId')
            .addSelect('cow.tagId', 'tagId')
            .addSelect('cow.name', 'name')
            .addSelect('SUM(record.amount)', 'total')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('record.date >= :startDate', { startDate })
            .andWhere('record.date <= :endDate', { endDate })
            .groupBy('cow.id')
            .addGroupBy('cow.tagId')
            .addGroupBy('cow.name')
            .orderBy('total', 'DESC')
            .limit(limit)
            .getRawMany();

        return results.map((r) => ({
            cowId: r.cowId,
            tagId: r.tagId,
            name: r.name,
            total: parseFloat(r.total || '0'),
            avgDaily: parseFloat(r.total || '0') / daysDiff,
        }));
    }

    /**
     * Get low producing cows for a period
     */
    async getLowProducers(
        farmId: string,
        startDate: string,
        endDate: string,
        limit: number = 5,
    ): Promise<Array<{ cowId: string; tagId: string; name: string | null; total: number; avgDaily: number }>> {
        const daysDiff = Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

        const results = await this.milkRecordRepository
            .createQueryBuilder('record')
            .innerJoin('record.cow', 'cow')
            .select('cow.id', 'cowId')
            .addSelect('cow.tagId', 'tagId')
            .addSelect('cow.name', 'name')
            .addSelect('SUM(record.amount)', 'total')
            .where('cow.farmId = :farmId', { farmId })
            .andWhere('cow.lifecycleStatus = :status', { status: 'active' })
            .andWhere('cow.gender = :gender', { gender: 'female' })
            .andWhere('record.date >= :startDate', { startDate })
            .andWhere('record.date <= :endDate', { endDate })
            .groupBy('cow.id')
            .addGroupBy('cow.tagId')
            .addGroupBy('cow.name')
            .orderBy('total', 'ASC')
            .limit(limit)
            .getRawMany();

        return results.map((r) => ({
            cowId: r.cowId,
            tagId: r.tagId,
            name: r.name,
            total: parseFloat(r.total || '0'),
            avgDaily: parseFloat(r.total || '0') / daysDiff,
        }));
    }

    /**
     * Get monthly milk production trends for reports
     */
    async getMonthlyTrends(
        farmId: string,
        startDate?: string | Date,
        endDate?: string | Date,
    ): Promise<Array<{ month: string; totalMilk: number }>> {
        // Default to last 6 months if not provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 5, 1);

        const records = await this.milkRecordRepository
            .createQueryBuilder('record')
            .select("TO_CHAR(record.date, 'Mon YYYY')", 'month')
            .addSelect('SUM(record.amount)', 'totalMilk')
            .where('record.farmId = :farmId', { farmId })
            .andWhere('record.date >= :startDate', { startDate: start })
            .andWhere('record.date <= :endDate', { endDate: end })
            .groupBy("TO_CHAR(record.date, 'Mon YYYY')")
            .addGroupBy("TO_CHAR(record.date, 'YYYY-MM')")
            .orderBy("TO_CHAR(record.date, 'YYYY-MM')", 'ASC')
            .getRawMany();


        return records.map(r => ({
            month: r.month,
            totalMilk: parseFloat(r.totalMilk || '0'),
        }));
    }

    /**
     * Get monthly milk income trends for financials
     */
    async getMonthlyIncomeTrends(
        farmId: string,
        startDate?: string | Date,
        endDate?: string | Date,
    ): Promise<Array<{ month: string; yearMonth: string; totalIncome: number }>> {
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), end.getMonth() - 5, 1);

        const records = await this.milkRecordRepository
            .createQueryBuilder('record')
            .select("TO_CHAR(record.date, 'Mon YYYY')", 'month')
            .addSelect("TO_CHAR(record.date, 'YYYY-MM')", 'yearMonth')
            .addSelect('SUM(record.totalValue)', 'totalIncome')
            .where('record.farmId = :farmId', { farmId })
            .andWhere('record.date >= :startDate', { startDate: start })
            .andWhere('record.date <= :endDate', { endDate: end })
            .groupBy("TO_CHAR(record.date, 'Mon YYYY')")
            .addGroupBy("TO_CHAR(record.date, 'YYYY-MM')")
            .orderBy("TO_CHAR(record.date, 'YYYY-MM')", 'ASC')
            .getRawMany();

        return records.map(r => ({
            month: r.month,
            yearMonth: r.yearMonth,
            totalIncome: parseFloat(r.totalIncome || '0'),
        }));
    }
}
