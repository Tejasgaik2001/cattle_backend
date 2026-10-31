import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cow, CowLifecycleStatus } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { ExternalBull } from '../../entities/external-bull.entity';
import { CreateCowDto, UpdateCowDto, UpdateLifecycleStatusDto, CowFilterDto, CreateExternalBullDto } from '../../dto/cow';
import { getPagination, createPaginatedResult, PaginatedResult } from '../../common/utils/pagination.utils';
import { isFutureDate } from '../../common/utils/date.utils';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';

export interface FamilyTreeNodeDto {
    id: string;
    gender: 'male' | 'female';
    parents: Array<{ id: string; type: 'blood' }>;
    children: Array<{ id: string; type: 'blood' }>;
    siblings: Array<{ id: string; type: 'blood' }>;
    spouses: Array<{ id: string; type: 'married' }>;
    tagNumber: string;
    name: string;
    dateOfBirth?: string;
    breed?: string;
    bornOnFarm: boolean;
    status: string;
    breedingMethod?: 'NATURAL' | 'AI' | null;
    isExternal: boolean;
    registrationNo?: string;
    source?: string;
    notes?: string;
    photoUrl?: string | null;
}

@Injectable()
export class CowsService {
    constructor(
        @InjectRepository(Cow)
        private cowRepository: Repository<Cow>,
        @InjectRepository(ExternalBull)
        private externalBullRepository: Repository<ExternalBull>,
        @InjectRepository(FinancialTransaction)
        private transactionRepository: Repository<FinancialTransaction>,
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

        // Validate pedigree (mother, sire, external sire, breeding method, cycle prevention)
        await this.validatePedigree(
            farmId,
            null,
            createCowDto.motherId,
            createCowDto.sireId,
            createCowDto.externalSireId,
            createCowDto.breedingMethod,
        );

        const cow = this.cowRepository.create({
            ...createCowDto,
            farmId,
            createdBy: userId,
            bornOnFarm: createCowDto.bornOnFarm !== undefined ? createCowDto.bornOnFarm : true,
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
            relations: ['mother', 'sire', 'externalSire'],
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

        // Validate pedigree
        const motherId = updateCowDto.motherId !== undefined ? updateCowDto.motherId : cow.motherId;
        const sireId = updateCowDto.sireId !== undefined ? updateCowDto.sireId : cow.sireId;
        const externalSireId = updateCowDto.externalSireId !== undefined ? updateCowDto.externalSireId : cow.externalSireId;
        const breedingMethod = updateCowDto.breedingMethod !== undefined ? updateCowDto.breedingMethod : cow.breedingMethod;

        await this.validatePedigree(farmId, cowId, motherId, sireId, externalSireId, breedingMethod);

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
        userId: string,
    ): Promise<Cow> {
        const cow = await this.findOne(farmId, cowId);
        cow.lifecycleStatus = updateStatusDto.lifecycleStatus;

        // If selling the cow, require and save sale information
        if (updateStatusDto.lifecycleStatus === 'sold') {
            if (!updateStatusDto.soldTo || !updateStatusDto.soldPrice || !updateStatusDto.soldDate) {
                throw new BadRequestException('soldTo, soldPrice, and soldDate are required when selling a cow');
            }
            cow.soldTo = updateStatusDto.soldTo;
            cow.soldPrice = updateStatusDto.soldPrice;
            cow.soldDate = new Date(updateStatusDto.soldDate);
            cow.soldDescription = updateStatusDto.soldDescription || null;

            // Create a financial transaction for the cow sale
            let description = `Sold ${cow.name || cow.tagId} to ${updateStatusDto.soldTo}`;
            if (updateStatusDto.soldDescription) {
                description += ` - ${updateStatusDto.soldDescription}`;
            }
            
            const saleTransaction = this.transactionRepository.create({
                farmId,
                cowId: cow.id,
                type: 'income',
                category: 'Cow Sales',
                amount: updateStatusDto.soldPrice,
                date: new Date(updateStatusDto.soldDate),
                description,
                createdBy: userId,
            });
            await this.transactionRepository.save(saleTransaction);
        } else {
            // Clear sale information if not sold
            cow.soldTo = null;
            cow.soldPrice = null;
            cow.soldDate = null;
            cow.soldDescription = null;
        }

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
     * Get all active male bulls (for natural sire dropdowns)
     */
    async getActiveMales(farmId: string): Promise<Cow[]> {
        return this.cowRepository.find({
            where: { farmId, lifecycleStatus: 'active', gender: 'male' },
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

    /**
     * Create an external bull record (for AI breeding)
     */
    async createExternalBull(farmId: string, dto: CreateExternalBullDto, userId?: string): Promise<ExternalBull> {
        const existing = await this.externalBullRepository.findOne({
            where: { farmId, registrationNo: dto.registrationNo },
        });

        if (existing) {
            throw new ConflictException(`External bull with registration number "${dto.registrationNo}" already exists`);
        }

        const bull = this.externalBullRepository.create({
            ...dto,
            farmId,
            createdBy: userId,
        });

        return this.externalBullRepository.save(bull);
    }

    /**
     * Get all external bulls for a farm
     */
    async getExternalBulls(farmId: string): Promise<ExternalBull[]> {
        return this.externalBullRepository.find({
            where: { farmId },
            order: { name: 'ASC' },
        });
    }

    /**
     * Validate pedigree constraints (mother/sire rules, gender check, cycle prevention)
     */
    private async validatePedigree(
        farmId: string,
        cowId: string | null,
        motherId?: string | null,
        sireId?: string | null,
        externalSireId?: string | null,
        breedingMethod?: 'NATURAL' | 'AI' | null,
    ): Promise<void> {
        // Exactly one sire may be set, or neither if unknown
        if (sireId && externalSireId) {
            throw new BadRequestException('A calf cannot have both an on-farm sire and an external sire. Choose one.');
        }

        if (breedingMethod === 'NATURAL' && externalSireId) {
            throw new BadRequestException('Breeding method is NATURAL, but an external sire was provided.');
        }

        // Validate Mother
        if (motherId) {
            if (cowId && motherId === cowId) {
                throw new BadRequestException('A cow cannot be its own mother');
            }
            const mother = await this.cowRepository.findOne({
                where: { id: motherId, farmId },
            });
            if (!mother) {
                throw new BadRequestException('Mother cow not found in this farm');
            }
            if (mother.gender !== 'female') {
                throw new BadRequestException('Mother must be female');
            }
        }

        // Validate On-Farm Sire
        if (sireId) {
            if (cowId && sireId === cowId) {
                throw new BadRequestException('A bull cannot be its own sire');
            }
            const sire = await this.cowRepository.findOne({
                where: { id: sireId, farmId },
            });
            if (!sire) {
                throw new BadRequestException('Sire bull not found in this farm');
            }
            if (sire.gender !== 'male') {
                throw new BadRequestException('Sire must be male');
            }
        }

        // Validate External Sire
        if (externalSireId) {
            const extBull = await this.externalBullRepository.findOne({
                where: { id: externalSireId, farmId },
            });
            if (!extBull) {
                throw new BadRequestException('External sire bull not found in this farm');
            }
        }

        // Prevent cycles in family tree
        if (cowId && (motherId || sireId)) {
            await this.detectCycle(farmId, cowId, motherId, sireId);
        }
    }

    /**
     * Cycle detection: an animal cannot be its own ancestor
     */
    private async detectCycle(
        farmId: string,
        targetCowId: string,
        motherId?: string | null,
        sireId?: string | null,
    ): Promise<void> {
        const visited = new Set<string>();
        const queue: string[] = [];

        if (motherId) queue.push(motherId);
        if (sireId) queue.push(sireId);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (currentId === targetCowId) {
                throw new BadRequestException('Cycle detected in pedigree: An animal cannot be its own ancestor');
            }
            if (!visited.has(currentId)) {
                visited.add(currentId);
                const parent = await this.cowRepository.findOne({
                    where: { id: currentId, farmId },
                    select: ['id', 'motherId', 'sireId'],
                });
                if (parent) {
                    if (parent.motherId && !visited.has(parent.motherId)) queue.push(parent.motherId);
                    if (parent.sireId && !visited.has(parent.sireId)) queue.push(parent.sireId);
                }
            }
        }
    }

    /**
     * Get family tree data for all cows in the farm in relatives-tree Node shape
     */
    async getFamilyTree(farmId: string, rootId?: string): Promise<FamilyTreeNodeDto[]> {
        const [cows, externalBulls] = await Promise.all([
            this.cowRepository.find({
                where: { farmId },
                relations: ['mother', 'sire', 'externalSire'],
                order: { dateOfBirth: 'ASC' },
            }),
            this.externalBullRepository.find({
                where: { farmId },
                order: { createdAt: 'ASC' },
            }),
        ]);

        const nodeMap = new Map<string, FamilyTreeNodeDto>();

        // 1. Initialize node entries for all cows
        for (const cow of cows) {
            nodeMap.set(cow.id, {
                id: cow.id,
                gender: cow.gender === 'male' ? 'male' : 'female',
                parents: [],
                children: [],
                siblings: [],
                spouses: [],
                tagNumber: cow.tagId,
                name: cow.name || cow.tagId,
                dateOfBirth: cow.dateOfBirth ? cow.dateOfBirth.toString() : undefined,
                breed: cow.breed || undefined,
                bornOnFarm: cow.bornOnFarm ?? true,
                status: cow.lifecycleStatus,
                breedingMethod: cow.breedingMethod,
                isExternal: false,
                photoUrl: cow.photoUrl,
            });
        }

        // 2. Initialize node entries for external bulls (prefix with "ext-")
        for (const bull of externalBulls) {
            const extId = `ext-${bull.id}`;
            nodeMap.set(extId, {
                id: extId,
                gender: 'male',
                parents: [],
                children: [],
                siblings: [],
                spouses: [],
                tagNumber: bull.registrationNo,
                name: bull.name,
                breed: bull.breed || undefined,
                bornOnFarm: false,
                status: 'active',
                breedingMethod: 'AI',
                isExternal: true,
                registrationNo: bull.registrationNo,
                source: bull.source || undefined,
                notes: bull.notes || undefined,
            });
        }

        // 3. Connect parents, children, and spouses
        for (const cow of cows) {
            const childNode = nodeMap.get(cow.id);
            if (!childNode) continue;

            const motherId = cow.motherId && nodeMap.has(cow.motherId) ? cow.motherId : null;
            const sireId = cow.sireId && nodeMap.has(cow.sireId)
                ? cow.sireId
                : (cow.externalSireId && nodeMap.has(`ext-${cow.externalSireId}`) ? `ext-${cow.externalSireId}` : null);

            // Connect Mother
            if (motherId) {
                const motherNode = nodeMap.get(motherId)!;
                if (!childNode.parents.some(p => p.id === motherId)) {
                    childNode.parents.push({ id: motherId, type: 'blood' });
                }
                if (!motherNode.children.some(c => c.id === childNode.id)) {
                    motherNode.children.push({ id: childNode.id, type: 'blood' });
                }
            }

            // Connect Sire
            if (sireId) {
                const sireNode = nodeMap.get(sireId)!;
                if (!childNode.parents.some(p => p.id === sireId)) {
                    childNode.parents.push({ id: sireId, type: 'blood' });
                }
                if (!sireNode.children.some(c => c.id === childNode.id)) {
                    sireNode.children.push({ id: childNode.id, type: 'blood' });
                }
            }

            // Link Parents as Spouses (married pair in relatives-tree layout)
            if (motherId && sireId) {
                const motherNode = nodeMap.get(motherId)!;
                const sireNode = nodeMap.get(sireId)!;

                if (!motherNode.spouses.some(s => s.id === sireId)) {
                    motherNode.spouses.push({ id: sireId, type: 'married' });
                }
                if (!sireNode.spouses.some(s => s.id === motherId)) {
                    sireNode.spouses.push({ id: motherId, type: 'married' });
                }
            }
        }

        // 4. Connect siblings (children that share at least one parent)
        for (const node of nodeMap.values()) {
            if (node.parents.length > 0) {
                const parentIds = new Set(node.parents.map(p => p.id));
                for (const otherNode of nodeMap.values()) {
                    if (otherNode.id !== node.id && otherNode.parents.length > 0) {
                        const sharesParent = otherNode.parents.some(p => parentIds.has(p.id));
                        if (sharesParent) {
                            if (!node.siblings.some(s => s.id === otherNode.id)) {
                                node.siblings.push({ id: otherNode.id, type: 'blood' });
                            }
                        }
                    }
                }
            }
        }

        const allNodes = Array.from(nodeMap.values());

        // 5. If rootId is provided, filter nodes to the connected lineage of rootId
        if (rootId && nodeMap.has(rootId)) {
            const connectedIds = new Set<string>();
            const queue: string[] = [rootId];
            connectedIds.add(rootId);

            while (queue.length > 0) {
                const currId = queue.shift()!;
                const currNode = nodeMap.get(currId);
                if (!currNode) continue;

                // Traverse parents, children, spouses, siblings
                const relatedIds = [
                    ...currNode.parents.map(r => r.id),
                    ...currNode.children.map(r => r.id),
                    ...currNode.spouses.map(r => r.id),
                    ...currNode.siblings.map(r => r.id),
                ];

                for (const relId of relatedIds) {
                    if (!connectedIds.has(relId) && nodeMap.has(relId)) {
                        connectedIds.add(relId);
                        queue.push(relId);
                    }
                }
            }

            // Return filtered nodes, with relations restricted to the connected set
            return allNodes
                .filter(n => connectedIds.has(n.id))
                .map(n => ({
                    ...n,
                    parents: n.parents.filter(r => connectedIds.has(r.id)),
                    children: n.children.filter(r => connectedIds.has(r.id)),
                    spouses: n.spouses.filter(r => connectedIds.has(r.id)),
                    siblings: n.siblings.filter(r => connectedIds.has(r.id)),
                }));
        }

        return allNodes;
    }
}
