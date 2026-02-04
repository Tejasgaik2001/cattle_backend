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
@Controller('api/v1/farms/:farmId/milk-records')
@UseGuards(JwtAuthGuard)
export class MilkRecordsController {
    constructor(
        private readonly milkRecordsService: MilkRecordsService,
        private readonly farmsService: FarmsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Add a single milk record' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 201, description: 'Record created' })
    @ApiResponse({ status: 400, description: 'Only female cows can have milk records' })
    @ApiResponse({ status: 409, description: 'Record already exists for this cow/date/time' })
    async create(
        @Param('farmId') farmId: string,
        @Body() createDto: CreateMilkRecordDto,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.milkRecordsService.create(farmId, createDto, user.id);
    }

    @Post('bulk')
    @ApiOperation({ summary: 'Add multiple milk records at once' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 201, description: 'Records created/updated' })
    async createBulk(
        @Param('farmId') farmId: string,
        @Body() bulkDto: BulkMilkRecordDto,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        const records = await this.milkRecordsService.createBulk(farmId, bulkDto, user.id);
        return {
            message: `${records.length} milk records saved successfully`,
            count: records.length,
            records,
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get milk records with filters' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({ status: 200, description: 'Paginated list of milk records' })
    async findAll(
        @Param('farmId') farmId: string,
        @Query() filterDto: MilkRecordFilterDto,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.milkRecordsService.findAll(farmId, filterDto);
    }

    @Get('today')
    @ApiOperation({ summary: "Get today's milk production stats" })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiResponse({
        status: 200,
        description: "Today's total, yesterday's total, and change percentage",
    })
    async getTodayStats(
        @Param('farmId') farmId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
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
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'recordId', description: 'Record UUID' })
    @ApiResponse({ status: 200, description: 'Milk record details' })
    @ApiResponse({ status: 404, description: 'Record not found' })
    async findOne(
        @Param('farmId') farmId: string,
        @Param('recordId') recordId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.milkRecordsService.findOne(farmId, recordId);
    }

    @Patch(':recordId')
    @ApiOperation({ summary: 'Update a milk record amount' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'recordId', description: 'Record UUID' })
    @ApiResponse({ status: 200, description: 'Record updated' })
    async update(
        @Param('farmId') farmId: string,
        @Param('recordId') recordId: string,
        @Body('amount') amount: number,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        return this.milkRecordsService.update(farmId, recordId, amount);
    }

    @Delete(':recordId')
    @ApiOperation({ summary: 'Delete a milk record' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'recordId', description: 'Record UUID' })
    @ApiResponse({ status: 200, description: 'Record deleted' })
    async remove(
        @Param('farmId') farmId: string,
        @Param('recordId') recordId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.milkRecordsService.remove(farmId, recordId);
        return { message: 'Milk record deleted successfully' };
    }
}
