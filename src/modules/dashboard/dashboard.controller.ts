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
import { FarmsService } from '../farms/farms.service';
import { CowsService } from '../cows/cows.service';
import { MilkRecordsService } from '../milk-records/milk-records.service';
import { CowEventsService } from '../cow-events/cow-events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(
        private readonly farmsService: FarmsService,
        private readonly cowsService: CowsService,
        private readonly milkRecordsService: MilkRecordsService,
        private readonly cowEventsService: CowEventsService,
    ) { }

    @Get('summary')
    @ApiOperation({ summary: 'Get dashboard summary with aggregated metrics' })
    @ApiResponse({ status: 200, description: 'Dashboard summary data' })
    async getDashboardSummary(
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);

        const [stats, todayMilk, yesterdayMilk, healthBreedingOverview] = await Promise.all([
            this.cowsService.getStats(farmId),
            this.milkRecordsService.getTodayTotal(farmId),
            this.milkRecordsService.getYesterdayTotal(farmId),
            this.cowEventsService.getHealthBreedingOverview(farmId),
        ]);

        return {
            totalHerdSize: stats.totalCows,
            lactatingCowsCount: stats.femaleCows, // Simplified - could be more specific
            pregnantCowsCount: healthBreedingOverview.pregnantCows,
            cowsUnderTreatmentCount: healthBreedingOverview.cowsUnderTreatment,
            todayMilkTotal: todayMilk,
            yesterdayMilkTotal: yesterdayMilk,
        };
    }

    @Get('alerts')
    @ApiOperation({ summary: 'Get critical alerts for the farm' })
    @ApiResponse({ status: 200, description: 'List of critical alerts' })
    async getAlerts(
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);

        const tasks = await this.cowEventsService.getHealthBreedingTasks(farmId);

        // Convert tasks to alerts format
        const alerts = tasks.slice(0, 5).map(task => ({
            id: task.id,
            type: task.taskType === 'VACCINATION_DUE' ? 'vaccination_due' : 'health_issue',
            title: task.taskType === 'VACCINATION_DUE' ? 'Vaccination Due' :
                task.taskType === 'HEALTH_FOLLOWUP' ? 'Health Follow-up' : 'Calving Expected',
            message: task.message,
            cowId: task.cowId,
            priority: task.urgency,
            createdAt: new Date().toISOString(),
        }));

        return alerts;
    }
}
