import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Farm } from '../../entities/farm.entity';
import { FarmMembership, FarmRole } from '../../entities/farm-membership.entity';
import { User } from '../../entities/user.entity';
import { CreateFarmDto, UpdateFarmDto } from '../../dto/farm';

@Injectable()
export class FarmsService {
    constructor(
        @InjectRepository(Farm)
        private farmRepository: Repository<Farm>,
        @InjectRepository(FarmMembership)
        private membershipRepository: Repository<FarmMembership>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    /**
     * Create a new farm (user becomes owner)
     */
    async create(createFarmDto: CreateFarmDto, userId: string): Promise<Farm> {
        const farm = this.farmRepository.create({
            ...createFarmDto,
            createdBy: userId,
        });

        const savedFarm = await this.farmRepository.save(farm);

        // Create ownership membership
        const membership = this.membershipRepository.create({
            userId,
            farmId: savedFarm.id,
            role: 'owner',
        });

        await this.membershipRepository.save(membership);

        return savedFarm;
    }

    /**
     * Get all farms for a user
     */
    async findAllForUser(userId: string): Promise<Farm[]> {
        const memberships = await this.membershipRepository.find({
            where: { userId },
            relations: ['farm'],
        });

        return memberships.map((m) => m.farm);
    }

    /**
     * Get farm by ID (with membership check)
     */
    async findOne(farmId: string, userId: string): Promise<Farm> {
        const membership = await this.membershipRepository.findOne({
            where: { userId, farmId },
            relations: ['farm'],
        });

        if (!membership) {
            throw new ForbiddenException('You are not a member of this farm');
        }

        return membership.farm;
    }

    /**
     * Update farm (owner only)
     */
    async update(
        farmId: string,
        updateFarmDto: UpdateFarmDto,
        userId: string,
    ): Promise<Farm> {
        await this.checkOwnership(farmId, userId);

        const farm = await this.farmRepository.findOne({ where: { id: farmId } });
        if (!farm) {
            throw new NotFoundException('Farm not found');
        }

        Object.assign(farm, updateFarmDto);
        return this.farmRepository.save(farm);
    }

    /**
     * Delete farm (owner only)
     */
    async remove(farmId: string, userId: string): Promise<void> {
        await this.checkOwnership(farmId, userId);

        const farm = await this.farmRepository.findOne({ where: { id: farmId } });
        if (!farm) {
            throw new NotFoundException('Farm not found');
        }

        await this.farmRepository.remove(farm);
    }

    /**
     * Get all members of a farm
     */
    async getMembers(farmId: string, userId: string): Promise<FarmMembership[]> {
        await this.checkMembership(farmId, userId);

        return this.membershipRepository.find({
            where: { farmId },
            relations: ['user'],
        });
    }

    /**
     * Remove a member from farm (owner only)
     */
    async removeMember(
        farmId: string,
        memberId: string,
        requesterId: string,
    ): Promise<void> {
        await this.checkOwnership(farmId, requesterId);

        if (memberId === requesterId) {
            throw new ForbiddenException('You cannot remove yourself');
        }

        const membership = await this.membershipRepository.findOne({
            where: { farmId, userId: memberId },
        });

        if (!membership) {
            throw new NotFoundException('Member not found');
        }

        await this.membershipRepository.remove(membership);
    }

    /**
     * Check if user is a member of the farm
     */
    async checkMembership(farmId: string, userId: string): Promise<FarmMembership> {
        const membership = await this.membershipRepository.findOne({
            where: { userId, farmId },
        });

        if (!membership) {
            throw new ForbiddenException('You are not a member of this farm');
        }

        return membership;
    }

    /**
     * Check if user is an owner of the farm
     */
    async checkOwnership(farmId: string, userId: string): Promise<FarmMembership> {
        const membership = await this.membershipRepository.findOne({
            where: { userId, farmId },
        });

        if (!membership) {
            throw new ForbiddenException('You are not a member of this farm');
        }

        if (membership.role !== 'owner') {
            throw new ForbiddenException('Only farm owners can perform this action');
        }

        return membership;
    }

    /**
     * Get user's role in a farm
     */
    async getUserRole(farmId: string, userId: string): Promise<FarmRole | null> {
        const membership = await this.membershipRepository.findOne({
            where: { userId, farmId },
        });

        return membership?.role || null;
    }
}
