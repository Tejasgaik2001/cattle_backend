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
} from '@nestjs/swagger';
import { MilkRecordsService } from './milk-records.service';
import { FarmsService } from '../farms/farms.service';
import {
    CreateMilkRecordDto,
    BulkMilkRecordDto,
    MilkRecordFilterDto,
} from '../../dto/milk-record';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Milk Records')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/milk-records')
@UseGuards(JwtAuthGuard)
export class MilkRecordsController {
    constructor(
        private readonly milkRecordsService: MilkRecordsService,
        private readonly farmsService: FarmsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Add a single milk record' })
    @ApiResponse({ status: 201, description: 'Record created' })
    @ApiResponse({ status: 400, description: 'Only female cows can have milk records' })
    @ApiResponse({ status: 409, description: 'Record already exists for this cow/date/time' })
    async create(
        @Body() createDto: CreateMilkRecordDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.milkRecordsService.create(farmId, createDto, user.id);
    }

    @Post('bulk')
    @ApiOperation({ summary: 'Add multiple milk records at once' })
    @ApiResponse({ status: 201, description: 'Records created/updated' })
    async createBulk(
        @Body() bulkDto: BulkMilkRecordDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const records = await this.milkRecordsService.createBulk(farmId, bulkDto, user.id);
        return {
            message: `${records.length} milk records saved successfully`,
            count: records.length,
            records,
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get milk records with filters' })
    @ApiResponse({ status: 200, description: 'Paginated list of milk records' })
    async findAll(
        @Query() filterDto: MilkRecordFilterDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.milkRecordsService.findAll(farmId, filterDto);
    }

    @Get('today')
    @ApiOperation({ summary: "Get today's milk production stats" })
    @ApiResponse({
        status: 200,
        description: "Today's total, yesterday's total, and change percentage",
    })
    async getTodayStats(
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const [todayTotal, yesterdayTotal] = await Promise.all([
            this.milkRecordsService.getTodayTotal(farmId),
            this.milkRecordsService.getYesterdayTotal(farmId),
        ]);

        const change = yesterdayTotal > 0
            ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
            : 0;

        return {
            today: todayTotal,
            yesterday: yesterdayTotal,
            changePercent: Math.round(change * 10) / 10,
        };
    }

    @Get(':recordId')
    @ApiOperation({ summary: 'Get a single milk record' })
    @ApiParam({ name: 'recordId', description: 'Record UUID' })
    @ApiResponse({ status: 200, description: 'Milk record details' })
    @ApiResponse({ status: 404, description: 'Record not found' })
    async findOne(
        @Param('recordId') recordId: string,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.milkRecordsService.findOne(farmId, recordId);
    }

    @Patch(':recordId')
    @ApiOperation({ summary: 'Update a milk record amount' })
    @ApiParam({ name: 'recordId', description: 'Record UUID' })
    @ApiResponse({ status: 200, description: 'Record updated' })
    async update(
        @Param('recordId') recordId: string,
        @Body('amount') amount: number,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.milkRecordsService.update(farmId, recordId, amount);
    }

    @Delete(':recordId')
    @ApiOperation({ summary: 'Delete a milk record' })
    @ApiParam({ name: 'recordId', description: 'Record UUID' })
    @ApiResponse({ status: 200, description: 'Record deleted' })
    async remove(
        @Param('recordId') recordId: string,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.milkRecordsService.remove(farmId, recordId);
        return { message: 'Milk record deleted successfully' };
    }
}
