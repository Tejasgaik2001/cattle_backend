import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Cow, CowLifecycleStatus } from '../../entities/cow.entity';
import { CreateCowDto, UpdateCowDto, UpdateLifecycleStatusDto, CowFilterDto } from '../../dto/cow';
import { getPagination, createPaginatedResult, PaginatedResult } from '../../common/utils/pagination.utils';
import { isFutureDate } from '../../common/utils/date.utils';

@Injectable()
export class CowsService {
    constructor(
        @InjectRepository(Cow)
        private cowRepository: Repository<Cow>,
    ) { }

    /**
     * Create a new cow
     */
    async create(farmId: string, createCowDto: CreateCowDto, userId: string): Promise<Cow> {
        // Validate dates are not in the future
        if (isFutureDate(createCowDto.dateOfBirth)) {
            throw new BadRequestException('Date of birth cannot be in the future');
        }
        if (isFutureDate(createCowDto.acquisitionDate)) {
            throw new BadRequestException('Acquisition date cannot be in the future');
        }

        // Check if tag ID is unique within the farm
        const existingCow = await this.cowRepository.findOne({
            where: { farmId, tagId: createCowDto.tagId },
        });

        if (existingCow) {
            throw new ConflictException(`Tag ID "${createCowDto.tagId}" already exists in this farm`);
        }

        // Validate mother ID if provided
        if (createCowDto.motherId) {
            const mother = await this.cowRepository.findOne({
                where: { id: createCowDto.motherId, farmId },
            });
            if (!mother) {
                throw new BadRequestException('Mother cow not found in this farm');
            }
            if (mother.gender !== 'female') {
                throw new BadRequestException('Mother must be female');
            }
        }

        const cow = this.cowRepository.create({
            ...createCowDto,
            farmId,
            createdBy: userId,
        });

        return this.cowRepository.save(cow);
    }

    /**
     * Get all cows for a farm with filters
     */
    async findAll(farmId: string, filterDto: CowFilterDto): Promise<PaginatedResult<Cow>> {
        const { skip, take } = getPagination(filterDto);

        const queryBuilder = this.cowRepository
            .createQueryBuilder('cow')
            .where('cow.farmId = :farmId', { farmId });

        // Apply filters
        if (filterDto.search) {
            queryBuilder.andWhere(
                '(cow.tagId ILIKE :search OR cow.name ILIKE :search)',
                { search: `%${filterDto.search}%` },
            );
        }

        if (filterDto.lifecycleStatus) {
            queryBuilder.andWhere('cow.lifecycleStatus = :status', {
                status: filterDto.lifecycleStatus,
            });
        }

        if (filterDto.gender) {
            queryBuilder.andWhere('cow.gender = :gender', { gender: filterDto.gender });
        }

        if (filterDto.breed) {
            queryBuilder.andWhere('cow.breed ILIKE :breed', { breed: `%${filterDto.breed}%` });
        }

        // Advanced Health/Breeding Filters
        if (filterDto.isUnderTreatment === 'true') {
            queryBuilder.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('cow_events', 'event')
                    .where('event.cow_id = cow.id')
                    .andWhere('event.type = :hType', { hType: 'HEALTH' })
                    .andWhere("event.metadata->>'isUnderTreatment' = :isT", { isT: 'true' })
                    .getQuery();
                return `EXISTS ${subQuery}`;
            });
        }

        if (filterDto.isPregnant === 'true') {
            queryBuilder.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('cow_events', 'event')
                    .where('event.cow_id = cow.id')
                    .andWhere('event.type = :bType', { bType: 'BREEDING' })
                    .andWhere("event.metadata->>'result' = :res", { res: 'confirmed' })
                    .getQuery();
                return `EXISTS ${subQuery}`;
            });
        }

        if (filterDto.healthIssuesRecent === 'true') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            queryBuilder.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('cow_events', 'event')
                    .where('event.cow_id = cow.id')
                    .andWhere('event.type = :hType2', { hType2: 'HEALTH' })
                    .andWhere('event.date >= :sDays', { sDays: sevenDaysAgo.toISOString().split('T')[0] })
                    .getQuery();
                return `EXISTS ${subQuery}`;
            });
        }

        if (filterDto.vaccinationsDue === 'true') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            queryBuilder.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('1')
                    .from('cow_events', 'event')
                    .where('event.cow_id = cow.id')
                    .andWhere('event.type = :vType', { vType: 'VACCINATION' })
                    .andWhere("event.metadata->>'nextDueDate' <= :nWeek", { nWeek: nextWeek.toISOString().split('T')[0] })
                    .getQuery();
                return `EXISTS ${subQuery}`;
            });
        }

        // Apply sorting
        const sortBy = filterDto.sortBy || 'createdAt';
        const sortOrder = filterDto.sortOrder || 'DESC';
        queryBuilder.orderBy(`cow.${sortBy}`, sortOrder);

        // Get total count
        const total = await queryBuilder.getCount();

        // Apply pagination
        const cows = await queryBuilder.skip(skip).take(take).getMany();

        return createPaginatedResult(cows, total, filterDto);
    }

    /**
     * Get a cow by ID
     */
    async findOne(farmId: string, cowId: string): Promise<Cow> {
        const cow = await this.cowRepository.findOne({
            where: { id: cowId, farmId },
            relations: ['mother'],
        });

        if (!cow) {
            throw new NotFoundException('Cow not found');
        }

        return cow;
    }

    /**
     * Update a cow
     */
    async update(
        farmId: string,
        cowId: string,
        updateCowDto: UpdateCowDto,
        userId: string,
    ): Promise<Cow> {
        const cow = await this.findOne(farmId, cowId);

        // Validate dates if provided
        if (updateCowDto.dateOfBirth && isFutureDate(updateCowDto.dateOfBirth)) {
            throw new BadRequestException('Date of birth cannot be in the future');
        }
        if (updateCowDto.acquisitionDate && isFutureDate(updateCowDto.acquisitionDate)) {
            throw new BadRequestException('Acquisition date cannot be in the future');
        }

        // Check tag ID uniqueness if changing
        if (updateCowDto.tagId && updateCowDto.tagId !== cow.tagId) {
            const existingCow = await this.cowRepository.findOne({
                where: { farmId, tagId: updateCowDto.tagId },
            });
            if (existingCow) {
                throw new ConflictException(`Tag ID "${updateCowDto.tagId}" already exists in this farm`);
            }
        }

        // Validate mother ID if provided
        if (updateCowDto.motherId) {
            if (updateCowDto.motherId === cowId) {
                throw new BadRequestException('A cow cannot be its own mother');
            }
            const mother = await this.cowRepository.findOne({
                where: { id: updateCowDto.motherId, farmId },
            });
            if (!mother) {
                throw new BadRequestException('Mother cow not found in this farm');
            }
            if (mother.gender !== 'female') {
                throw new BadRequestException('Mother must be female');
            }
        }

        Object.assign(cow, updateCowDto);
        return this.cowRepository.save(cow);
    }

    /**
     * Update lifecycle status
     */
    async updateLifecycleStatus(
        farmId: string,
        cowId: string,
        updateStatusDto: UpdateLifecycleStatusDto,
    ): Promise<Cow> {
        const cow = await this.findOne(farmId, cowId);
        cow.lifecycleStatus = updateStatusDto.lifecycleStatus;
        return this.cowRepository.save(cow);
    }

    /**
     * Delete a cow
     */
    async remove(farmId: string, cowId: string): Promise<void> {
        const cow = await this.findOne(farmId, cowId);
        await this.cowRepository.remove(cow);
    }

    /**
     * Update cow photo
     */
    async updatePhoto(farmId: string, cowId: string, photoUrl: string): Promise<Cow> {
        const cow = await this.findOne(farmId, cowId);
        cow.photoUrl = photoUrl;
        return this.cowRepository.save(cow);
    }

    /**
     * Get cow count by lifecycle status
     */
    async getCountByStatus(farmId: string): Promise<Record<CowLifecycleStatus, number>> {
        const results = await this.cowRepository
            .createQueryBuilder('cow')
            .select('cow.lifecycleStatus', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('cow.farmId = :farmId', { farmId })
            .groupBy('cow.lifecycleStatus')
            .getRawMany();

        const counts: Record<CowLifecycleStatus, number> = {
            active: 0,
            sold: 0,
            deceased: 0,
        };

        results.forEach((r) => {
            counts[r.status as CowLifecycleStatus] = parseInt(r.count, 10);
        });

        return counts;
    }

    /**
     * Get total count of active cows
     */
    async getActiveCowCount(farmId: string): Promise<number> {
        return this.cowRepository.count({
            where: { farmId, lifecycleStatus: 'active' },
        });
    }

    /**
     * Get all active female cows (for breeding/milk records)
     */
    async getActiveFemales(farmId: string): Promise<Cow[]> {
        return this.cowRepository.find({
            where: { farmId, lifecycleStatus: 'active', gender: 'female' },
            order: { tagId: 'ASC' },
        });
    }

    /**
     * Get farm statistics
     */
    async getStats(farmId: string) {
        const totalCows = await this.cowRepository.count({ where: { farmId, lifecycleStatus: 'active' } });
        const femaleCows = await this.cowRepository.count({ where: { farmId, lifecycleStatus: 'active', gender: 'female' } });
        const maleCows = await this.cowRepository.count({ where: { farmId, lifecycleStatus: 'active', gender: 'male' } });

        return {
            totalCows,
            femaleCows,
            maleCows,
        };
    }
}
