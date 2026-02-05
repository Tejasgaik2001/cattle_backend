import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { ProductionFinanceService } from './production-finance.service';
import { FarmsService } from '../farms/farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Production & Finance')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/farms/:farmId/production-finance')
@UseGuards(JwtAuthGuard)
export class ProductionFinanceController {
    constructor(
        private readonly productionFinanceService: ProductionFinanceService,
        private readonly farmsService: FarmsService,
    ) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get aggregated production and finance overview' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({ status: 200, description: 'Aggregated overview metrics' })
    async getOverview(
        @Param('farmId') farmId: string,
        @Query('startDate') startDate: string | undefined,
        @Query('endDate') endDate: string | undefined,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.productionFinanceService.getOverview(farmId, startDate, endDate);
    }

    @Get('insights')
    @ApiOperation({ summary: 'Get operational insights (top/low producers, expense breakdown)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({ status: 200, description: 'Operational insights' })
    async getInsights(
        @Param('farmId') farmId: string,
        @Query('startDate') startDate: string | undefined,
        @Query('endDate') endDate: string | undefined,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.productionFinanceService.getOperationalInsights(farmId, startDate, endDate);
    }
}
