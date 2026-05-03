import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
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
import { FinancialService } from './financial.service';
import { FarmsService } from '../farms/farms.service';
import { CreateTransactionDto, TransactionFilterDto } from '../../dto/financial';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import { formatDate, startOfMonth, endOfMonth } from '../../common/utils/date.utils';

@ApiTags('Financial')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/financial')
@UseGuards(JwtAuthGuard)
export class FinancialController {
    constructor(
        private readonly financialService: FinancialService,
        private readonly farmsService: FarmsService,
    ) {}

    @Post('transactions')
    @ApiOperation({ summary: 'Create a financial transaction' })
    @ApiResponse({ status: 201, description: 'Transaction created' })
    async create(@Body() createDto: CreateTransactionDto, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.create(farmId, createDto, user.id);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Get transactions with filters' })
    @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
    async findAll(@Query() filterDto: TransactionFilterDto, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.findAll(farmId, filterDto);
    }

    @Get('overview')
    @ApiOperation({ summary: 'Get financial overview (income, expenses, profit/loss)' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async getOverview(
        @Query('startDate') startDate: string | undefined,
        @Query('endDate') endDate: string | undefined,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);

        if (!startDate || !endDate) {
            return this.financialService.getCurrentMonthOverview(farmId);
        }
        const overview = await this.financialService.getOverview(farmId, startDate, endDate);
        return { ...overview, period: `${startDate} to ${endDate}` };
    }

    @Get('expense-breakdown')
    @ApiOperation({ summary: 'Get expense breakdown by category' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async getExpenseBreakdown(
        @Query('startDate') startDate: string | undefined,
        @Query('endDate') endDate: string | undefined,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);

        const now = new Date();
        const start = startDate || formatDate(startOfMonth(now));
        const end = endDate || formatDate(endOfMonth(now));

        return this.financialService.getExpenseBreakdown(farmId, start, end);
    }

    @Get('summary/monthly')
    @ApiOperation({ summary: 'Get full monthly summary with category breakdown and people spending' })
    @ApiQuery({ name: 'year', required: false, description: 'Year (e.g. 2025)' })
    @ApiQuery({ name: 'month', required: false, description: 'Month index 0-11 (e.g. 0=Jan)' })
    async getMonthlySummary(
        @Query('year') year: string | undefined,
        @Query('month') month: string | undefined,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.getMonthlySummary(
            farmId,
            year ? parseInt(year) : undefined,
            month !== undefined ? parseInt(month) : undefined,
        );
    }

    @Get('summary/today')
    @ApiOperation({ summary: "Get today's income and expense totals" })
    async getTodaySummary(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.financialService.getTodaySummary(farmId);
    }

    @Get('summary/trend')
    @ApiOperation({ summary: 'Get last 7 days income/expense trend' })
    async getLast7DaysTrend(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.financialService.getLast7DaysTrend(farmId);
    }

    @Get('transactions/:transactionId')
    @ApiOperation({ summary: 'Get a single transaction' })
    @ApiParam({ name: 'transactionId', description: 'Transaction UUID' })
    async findOne(@Param('transactionId') transactionId: string, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.findOne(farmId, transactionId);
    }

    @Patch('transactions/:transactionId')
    @ApiOperation({ summary: 'Update a transaction' })
    @ApiParam({ name: 'transactionId', description: 'Transaction UUID' })
    async update(
        @Param('transactionId') transactionId: string,
        @Body() updateDto: Partial<CreateTransactionDto>,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.update(farmId, transactionId, updateDto);
    }

    @Delete('transactions/:transactionId')
    @ApiOperation({ summary: 'Delete a transaction' })
    @ApiParam({ name: 'transactionId', description: 'Transaction UUID' })
    async remove(@Param('transactionId') transactionId: string, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        await this.financialService.remove(farmId, transactionId);
        return { message: 'Transaction deleted successfully' };
    }
}
