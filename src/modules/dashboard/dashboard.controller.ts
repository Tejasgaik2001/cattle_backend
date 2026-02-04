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
import { DashboardService } from './dashboard.service';
import { AlertsService } from './alerts.service';
import { FarmsService } from '../farms/farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/farms/:farmId/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly alertsService: AlertsService,
        private readonly farmsService: FarmsService,
    ) { }

    @Get('summary')
    @ApiOperation({ summary: 'Get farm dashboard summary' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({
        status: 200,
        description: 'Dashboard summary with herd stats, milk production, etc.',
        schema: {
            example: {
                totalHerdSize: 25,
                activeCount: 22,
                lactatingCowsCount: 15,
                pregnantCowsCount: 5,
                cowsUnderTreatmentCount: 2,
                todayMilkTotal: 180.5,
                yesterdayMilkTotal: 175.2,
                milkChangePercent: 3.0,
            },
        },
    })
    async getSummary(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.dashboardService.getSummary(farmId);
    }

    @Get('alerts')
    @ApiOperation({ summary: 'Get active alerts (vaccinations due, health issues, calvings)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({
        status: 200,
        description: 'List of active alerts sorted by priority',
        schema: {
            example: [
                {
                    id: 'vax-uuid',
                    type: 'vaccination_due',
                    title: 'Vaccination Due',
                    message: 'FMD Vaccine is due on 2024-01-25',
                    cowId: 'uuid',
                    cowTagId: 'GV-001',
                    cowName: 'Lakshmi',
                    priority: 'medium',
                    dueDate: '2024-01-25',
                },
            ],
        },
    })
    async getAlerts(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.alertsService.getAlerts(farmId);
    }
}
