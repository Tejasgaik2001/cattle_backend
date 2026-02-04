import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FarmInvitation } from '../../entities/farm-invitation.entity';
import { FarmMembership, FarmRole } from '../../entities/farm-membership.entity';
import { User } from '../../entities/user.entity';
import { Farm } from '../../entities/farm.entity';
import { InviteMemberDto } from '../../dto/farm';

@Injectable()
export class InvitationsService {
    constructor(
        @InjectRepository(FarmInvitation)
        private invitationRepository: Repository<FarmInvitation>,
        @InjectRepository(FarmMembership)
        private membershipRepository: Repository<FarmMembership>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Farm)
        private farmRepository: Repository<Farm>,
    ) { }

    /**
     * Create an invitation to join a farm
     */
    async createInvitation(
        farmId: string,
        inviteMemberDto: InviteMemberDto,
    ): Promise<FarmInvitation> {
        const { email, role } = inviteMemberDto;
        const normalizedEmail = email.toLowerCase();

        // Check if user is already a member
        const existingUser = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            const existingMembership = await this.membershipRepository.findOne({
                where: { userId: existingUser.id, farmId },
            });

            if (existingMembership) {
                throw new ConflictException('User is already a member of this farm');
            }
        }

        // Check if there's a pending invitation
        const existingInvitation = await this.invitationRepository.findOne({
            where: { email: normalizedEmail, farmId, acceptedAt: IsNull() },
        });

        if (existingInvitation) {
            // Update existing invitation
            existingInvitation.role = role;
            existingInvitation.token = uuidv4();
            existingInvitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            return this.invitationRepository.save(existingInvitation);
        }

        // Create new invitation
        const invitation = this.invitationRepository.create({
            farmId,
            email: normalizedEmail,
            role,
            token: uuidv4(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        return this.invitationRepository.save(invitation);
    }

    /**
     * Accept an invitation
     */
    async acceptInvitation(token: string, userId: string): Promise<FarmMembership> {
        const invitation = await this.invitationRepository.findOne({
            where: { token },
            relations: ['farm'],
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.acceptedAt) {
            throw new BadRequestException('Invitation has already been accepted');
        }

        if (new Date() > invitation.expiresAt) {
            throw new BadRequestException('Invitation has expired');
        }

        // Get current user
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if invitation was for this user's email
        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            throw new BadRequestException('This invitation was not for your email address');
        }

        // Check if already a member
        const existingMembership = await this.membershipRepository.findOne({
            where: { userId, farmId: invitation.farmId },
        });

        if (existingMembership) {
            throw new ConflictException('You are already a member of this farm');
        }

        // Create membership
        const membership = this.membershipRepository.create({
            userId,
            farmId: invitation.farmId,
            role: invitation.role,
        });

        await this.membershipRepository.save(membership);

        // Mark invitation as accepted
        invitation.acceptedAt = new Date();
        await this.invitationRepository.save(invitation);

        return membership;
    }

    /**
     * Get pending invitations for a farm
     */
    async getPendingInvitations(farmId: string): Promise<FarmInvitation[]> {
        return this.invitationRepository.find({
            where: { farmId, acceptedAt: IsNull() },
        });
    }

    /**
     * Cancel an invitation
     */
    async cancelInvitation(invitationId: string, farmId: string): Promise<void> {
        const invitation = await this.invitationRepository.findOne({
            where: { id: invitationId, farmId },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.acceptedAt) {
            throw new BadRequestException('Cannot cancel an already accepted invitation');
        }

        await this.invitationRepository.remove(invitation);
    }

    /**
     * Get invitation details by token (for accept invite page)
     */
    async getInvitationByToken(token: string): Promise<{ farm: Farm; role: FarmRole; email: string }> {
        const invitation = await this.invitationRepository.findOne({
            where: { token },
            relations: ['farm'],
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.acceptedAt) {
            throw new BadRequestException('Invitation has already been accepted');
        }

        if (new Date() > invitation.expiresAt) {
            throw new BadRequestException('Invitation has expired');
        }

        return {
            farm: invitation.farm,
            role: invitation.role,
            email: invitation.email,
        };
    }
}
