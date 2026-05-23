import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { MemberDueService, SettleMemberDueDto } from './member-due.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import { FarmsService } from '../farms/farms.service';

@Controller('api/v1/reimbursements') 
@UseGuards(JwtAuthGuard)
export class MemberDueController {
    constructor(
        private readonly memberDueService: MemberDueService,
        private readonly farmsService: FarmsService
    ) {}

    @Get()
    async getAllPending(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return await this.memberDueService.findAllPending(farmId);
    }

    @Get('pending-by-person')
    async getPendingByPerson(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return await this.memberDueService.getPendingSummaryByPerson(farmId);
    }

    @Patch(':id/mark-paid')
    async settle(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: SettleMemberDueDto) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return await this.memberDueService.settle(id, dto, farmId);
    }
}
