import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { FarmsService } from './farms.service';
import { InvitationsService } from './invitations.service';
import { CreateFarmDto, UpdateFarmDto, InviteMemberDto } from '../../dto/farm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Farms')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/farms')
@UseGuards(JwtAuthGuard)
export class FarmsController {
    constructor(
        private readonly farmsService: FarmsService,
        private readonly invitationsService: InvitationsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new farm (user becomes owner)' })
    @ApiResponse({ status: 201, description: 'Farm created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async create(
        @CurrentUser() user: User,
        @Body() createFarmDto: CreateFarmDto,
    ) {
        const farm = await this.farmsService.create(createFarmDto, user.id);
        return {
            ...farm,
            role: 'owner',
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all farms for the current user' })
    @ApiResponse({ status: 200, description: 'List of farms with user roles' })
    async findAll(@CurrentUser() user: User) {
        const farms = await this.farmsService.findAllForUser(user.id);

        const farmsWithRoles = await Promise.all(
            farms.map(async (farm) => {
                const role = await this.farmsService.getUserRole(farm.id, user.id);
                return { ...farm, role };
            }),
        );

        return farmsWithRoles;
    }

    @Get(':farmId')
    @ApiOperation({ summary: 'Get farm details by ID' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, description: 'Farm details' })
    @ApiResponse({ status: 403, description: 'Not a member of this farm' })
    @ApiResponse({ status: 404, description: 'Farm not found' })
    async findOne(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ) {
        const farm = await this.farmsService.findOne(farmId, user.id);
        const role = await this.farmsService.getUserRole(farmId, user.id);
        return { ...farm, role };
    }

    @Patch(':farmId')
    @ApiOperation({ summary: 'Update farm (owner only)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, description: 'Farm updated successfully' })
    @ApiResponse({ status: 403, description: 'Only owners can update farm' })
    async update(
        @Param('farmId') farmId: string,
        @Body() updateFarmDto: UpdateFarmDto,
        @CurrentUser() user: User,
    ) {
        return this.farmsService.update(farmId, updateFarmDto, user.id);
    }

    @Delete(':farmId')
    @ApiOperation({ summary: 'Delete farm (owner only)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, description: 'Farm deleted successfully' })
    @ApiResponse({ status: 403, description: 'Only owners can delete farm' })
    async remove(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.remove(farmId, user.id);
        return { message: 'Farm deleted successfully' };
    }

    @Get(':farmId/members')
    @ApiOperation({ summary: 'Get all members of a farm' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, description: 'List of farm members' })
    async getMembers(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ) {
        const memberships = await this.farmsService.getMembers(farmId, user.id);
        return memberships.map((m) => ({
            id: m.user.id,
            email: m.user.email,
            name: m.user.name,
            photoUrl: m.user.photoUrl,
            role: m.role,
            joinedAt: m.createdAt,
        }));
    }

    @Post(':farmId/invitations')
    @ApiOperation({ summary: 'Invite a new member to the farm (owner only)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 201, description: 'Invitation created' })
    @ApiResponse({ status: 403, description: 'Only owners can invite members' })
    @ApiResponse({ status: 409, description: 'User already a member' })
    async inviteMember(
        @Param('farmId') farmId: string,
        @Body() inviteMemberDto: InviteMemberDto,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkOwnership(farmId, user.id);
        const invitation = await this.invitationsService.createInvitation(
            farmId,
            inviteMemberDto,
        );
        return {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            inviteLink: `/invite?token=${invitation.token}`,
        };
    }

    @Get(':farmId/invitations')
    @ApiOperation({ summary: 'Get pending invitations for a farm (owner only)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, description: 'List of pending invitations' })
    async getPendingInvitations(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.invitationsService.getPendingInvitations(farmId);
    }

    @Delete(':farmId/invitations/:invitationId')
    @ApiOperation({ summary: 'Cancel an invitation (owner only)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'invitationId', description: 'Invitation UUID' })
    @ApiResponse({ status: 200, description: 'Invitation cancelled' })
    async cancelInvitation(
        @Param('farmId') farmId: string,
        @Param('invitationId') invitationId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkOwnership(farmId, user.id);
        await this.invitationsService.cancelInvitation(invitationId, farmId);
        return { message: 'Invitation cancelled' };
    }

    @Delete(':farmId/members/:memberId')
    @ApiOperation({ summary: 'Remove a member from farm (owner only)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'memberId', description: 'Member user UUID' })
    @ApiResponse({ status: 200, description: 'Member removed' })
    @ApiResponse({ status: 403, description: 'Cannot remove yourself' })
    async removeMember(
        @Param('farmId') farmId: string,
        @Param('memberId') memberId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.removeMember(farmId, memberId, user.id);
        return { message: 'Member removed successfully' };
    }
}

@ApiTags('Invitations')
@Controller('api/v1/invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) { }

    @Get(':token')
    @ApiOperation({ summary: 'Get invitation details by token (public)' })
    @ApiParam({ name: 'token', description: 'Invitation token' })
    @ApiResponse({ status: 200, description: 'Invitation details' })
    @ApiResponse({ status: 400, description: 'Invitation expired or already accepted' })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    async getInvitation(@Param('token') token: string) {
        return this.invitationsService.getInvitationByToken(token);
    }

    @Post(':token/accept')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Accept an invitation (must be logged in)' })
    @ApiParam({ name: 'token', description: 'Invitation token' })
    @ApiResponse({ status: 200, description: 'Invitation accepted' })
    @ApiResponse({ status: 400, description: 'Wrong email or invitation expired' })
    async acceptInvitation(
        @Param('token') token: string,
        @CurrentUser() user: User,
    ) {
        const membership = await this.invitationsService.acceptInvitation(
            token,
            user.id,
        );
        return {
            message: 'Invitation accepted successfully',
            farmId: membership.farmId,
            role: membership.role,
        };
    }
}
