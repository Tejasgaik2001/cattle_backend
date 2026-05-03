import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
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
import { LoansService } from './loans.service';
import { FarmsService } from '../farms/farms.service';
import { CreateLoanDto } from '../../dto/loans/create-loan.dto';
import { CreateLoanPaymentDto } from '../../dto/loans/create-loan-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Loans')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
    constructor(
        private readonly loansService: LoansService,
        private readonly farmsService: FarmsService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a new loan' })
    @ApiResponse({ status: 201, description: 'Loan created' })
    async create(@Body() dto: CreateLoanDto, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.loansService.createLoan(farmId, dto, user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all loans with outstanding balances' })
    @ApiResponse({ status: 200, description: 'List of loans' })
    async findAll(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.loansService.findAll(farmId);
    }

    @Get('outstanding-total')
    @ApiOperation({ summary: 'Get total outstanding loan amount' })
    @ApiResponse({ status: 200, description: 'Total outstanding' })
    async getOutstandingTotal(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const total = await this.loansService.getTotalOutstanding(farmId);
        return { totalOutstanding: total };
    }

    @Get(':loanId')
    @ApiOperation({ summary: 'Get a single loan with payment history' })
    @ApiParam({ name: 'loanId', description: 'Loan UUID' })
    @ApiResponse({ status: 200, description: 'Loan detail' })
    async findOne(@Param('loanId') loanId: string, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.loansService.findOne(farmId, loanId);
    }

    @Post(':loanId/payments')
    @ApiOperation({ summary: 'Add a payment to a loan' })
    @ApiParam({ name: 'loanId', description: 'Loan UUID' })
    @ApiResponse({ status: 201, description: 'Payment recorded' })
    async addPayment(
        @Param('loanId') loanId: string,
        @Body() dto: CreateLoanPaymentDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.loansService.addPayment(farmId, loanId, dto, user.id);
    }

    @Patch(':loanId/status')
    @ApiOperation({ summary: 'Update loan status (active / closed)' })
    @ApiParam({ name: 'loanId', description: 'Loan UUID' })
    async updateStatus(
        @Param('loanId') loanId: string,
        @Body('status') status: 'active' | 'closed',
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.loansService.updateStatus(farmId, loanId, status);
    }
}
