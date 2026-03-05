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
    ) { }

    @Post('transactions')
    @ApiOperation({ summary: 'Create a financial transaction (owner only)' })
    @ApiResponse({ status: 201, description: 'Transaction created' })
    @ApiResponse({ status: 403, description: 'Only owners can manage finances' })
    async create(
        @Body() createDto: CreateTransactionDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.create(farmId, createDto, user.id);
    }

    @Get('transactions')
    @ApiOperation({ summary: 'Get transactions with filters (owner only)' })
    @ApiResponse({ status: 200, description: 'Paginated list of transactions' })
    async findAll(
        @Query() filterDto: TransactionFilterDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.findAll(farmId, filterDto);
    }

    @Get('overview')
    @ApiOperation({ summary: 'Get financial overview (income, expenses, profit/loss)' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({ status: 200, description: 'Financial overview' })
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
        return {
            ...overview,
            period: `${startDate} to ${endDate}`,
        };
    }

    @Get('expense-breakdown')
    @ApiOperation({ summary: 'Get expense breakdown by category' })
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
    @ApiResponse({ status: 200, description: 'Expense breakdown by category' })
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

    @Get('transactions/:transactionId')
    @ApiOperation({ summary: 'Get a single transaction' })
    @ApiParam({ name: 'transactionId', description: 'Transaction UUID' })
    @ApiResponse({ status: 200, description: 'Transaction details' })
    async findOne(
        @Param('transactionId') transactionId: string,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.financialService.findOne(farmId, transactionId);
    }

    @Patch('transactions/:transactionId')
    @ApiOperation({ summary: 'Update a transaction' })
    @ApiParam({ name: 'transactionId', description: 'Transaction UUID' })
    @ApiResponse({ status: 200, description: 'Transaction updated' })
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
    @ApiResponse({ status: 200, description: 'Transaction deleted' })
    async remove(
        @Param('transactionId') transactionId: string,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        await this.financialService.remove(farmId, transactionId);
        return { message: 'Transaction deleted successfully' };
    }
}
