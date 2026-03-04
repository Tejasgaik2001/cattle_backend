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
import { HealthBreedingService } from './health-breeding.service';
import { FarmsService } from '../farms/farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import { HealthBreedingOverview, HealthBreedingTask } from '../../dto';

@ApiTags('Health & Breeding')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/farms/:farmId/health-breeding')
@UseGuards(JwtAuthGuard)
export class HealthBreedingController {
    constructor(
        private readonly healthBreedingService: HealthBreedingService,
        private readonly farmsService: FarmsService,
    ) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get herd health and breeding overview metrics' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, type: HealthBreedingOverview })
    async getOverview(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ): Promise<HealthBreedingOverview> {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.healthBreedingService.getOverview(farmId);
    }

    @Get('tasks')
    @ApiOperation({ summary: 'Get upcoming and overdue health/breeding tasks' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, type: [HealthBreedingTask] })
    async getTasks(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ): Promise<HealthBreedingTask[]> {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.healthBreedingService.getTasks(farmId);
    }
}
