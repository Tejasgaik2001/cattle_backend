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
import { FarmsService } from '../farms/farms.service';
import { MilkRecordsService } from '../milk-records/milk-records.service';
import { FinancialService } from '../financial/financial.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/farms/:farmId/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(
        private readonly farmsService: FarmsService,
        private readonly milkRecordsService: MilkRecordsService,
        private readonly financialService: FinancialService,
    ) { }

    @Get('milk-production-trends')
    @ApiOperation({ summary: 'Get milk production trends for reports' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Milk production trends data' })
    async getMilkProductionTrends(
        @CurrentUser() user: User,
        @Param('farmId') farmId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);

        // Generate monthly trends for the last 6 months if no dates provided
        const trends = await this.milkRecordsService.getMonthlyTrends(
            farmId,
            startDate,
            endDate
        );

        return trends;
    }

    @Get('financial-trends')
    @ApiOperation({ summary: 'Get financial performance trends' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Financial trends data' })
    async getFinancialTrends(
        @CurrentUser() user: User,
        @Param('farmId') farmId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);

        const trends = await this.financialService.getMonthlyTrends(
            farmId,
            startDate,
            endDate
        );

        return trends;
    }

    @Get('expense-breakdown')
    @ApiOperation({ summary: 'Get expense breakdown by category' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Expense breakdown data' })
    async getExpenseBreakdown(
        @CurrentUser() user: User,
        @Param('farmId') farmId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);

        const breakdown = await this.financialService.getExpenseBreakdown(
            farmId,
            startDate,
            endDate
        );

        return breakdown;
    }
}
