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
@Controller('api/v1/production-finance')
@UseGuards(JwtAuthGuard)
export class ProductionFinanceController {
    constructor(
        private readonly productionFinanceService: ProductionFinanceService,
        private readonly farmsService: FarmsService,
    ) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get aggregated production and finance overview' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({ status: 200, description: 'Aggregated overview metrics' })
    async getOverview(
        @Query('startDate') startDate: string | undefined,
        @Query('endDate') endDate: string | undefined,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.productionFinanceService.getOverview(farmId, startDate, endDate);
    }

    @Get('insights')
    @ApiOperation({ summary: 'Get operational insights (top/low producers, expense breakdown)' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({ status: 200, description: 'Operational insights' })
    async getInsights(
        @Query('startDate') startDate: string | undefined,
        @Query('endDate') endDate: string | undefined,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.productionFinanceService.getOperationalInsights(farmId, startDate, endDate);
    }
}
