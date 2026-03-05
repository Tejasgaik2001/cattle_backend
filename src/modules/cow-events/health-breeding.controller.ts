import {
    Controller,
    Get,
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
import { CowEventsService } from './cow-events.service';
import { FarmsService } from '../farms/farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Health & Breeding')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/health-breeding')
@UseGuards(JwtAuthGuard)
export class HealthBreedingController {
    constructor(
        private readonly cowEventsService: CowEventsService,
        private readonly farmsService: FarmsService,
    ) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get health and breeding overview metrics for a farm' })
    @ApiResponse({ status: 200, description: 'Overview metrics' })
    async getOverview(
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.cowEventsService.getHealthBreedingOverview(farmId);
    }

    @Get('tasks')
    @ApiOperation({ summary: 'Get upcoming and overdue health/breeding tasks' })
    @ApiResponse({ status: 200, description: 'List of tasks' })
    async getTasks(
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.cowEventsService.getHealthBreedingTasks(farmId);
    }
}
