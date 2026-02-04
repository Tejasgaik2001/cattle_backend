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
import { CowEventsService } from './cow-events.service';
import { CowsService } from '../cows/cows.service';
import { FarmsService } from '../farms/farms.service';
import { CreateCowEventDto, UpdateCowEventDto } from '../../dto/cow-event';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import { CowEventType } from '../../entities/cow-event.entity';

@ApiTags('Cow Events')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/farms/:farmId/cows/:cowId/events')
@UseGuards(JwtAuthGuard)
export class CowEventsController {
    constructor(
        private readonly cowEventsService: CowEventsService,
        private readonly cowsService: CowsService,
        private readonly farmsService: FarmsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new event for a cow' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiResponse({ status: 201, description: 'Event created successfully' })
    async create(
        @Param('farmId') farmId: string,
        @Param('cowId') cowId: string,
        @Body() createCowEventDto: CreateCowEventDto,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.cowsService.findOne(farmId, cowId);
        return this.cowEventsService.create(cowId, createCowEventDto, user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all events for a cow' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiQuery({ name: 'type', required: false, enum: ['HEALTH', 'VACCINATION', 'BREEDING', 'NOTE', 'FINANCIAL'] })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Paginated list of events' })
    async findAll(
        @Param('farmId') farmId: string,
        @Param('cowId') cowId: string,
        @Query('type') type: CowEventType | undefined,
        @Query('page') page: string | undefined,
        @Query('limit') limit: string | undefined,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.cowsService.findOne(farmId, cowId);
        return this.cowEventsService.findAllForCow(cowId, {
            type,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get('counts')
    @ApiOperation({ summary: 'Get event counts by type' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiResponse({ status: 200, description: 'Event counts by type' })
    async getEventCounts(
        @Param('farmId') farmId: string,
        @Param('cowId') cowId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.cowsService.findOne(farmId, cowId);
        return this.cowEventsService.countEventsByType(cowId);
    }

    @Get('recent')
    @ApiOperation({ summary: 'Get recent events (timeline)' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of events (default 10)' })
    @ApiResponse({ status: 200, description: 'Recent events' })
    async getRecentEvents(
        @Param('farmId') farmId: string,
        @Param('cowId') cowId: string,
        @Query('limit') limit: string | undefined,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.cowsService.findOne(farmId, cowId);
        return this.cowEventsService.getRecentEvents(
            cowId,
            limit ? parseInt(limit, 10) : 10,
        );
    }

    @Get(':eventId')
    @ApiOperation({ summary: 'Get a single event' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiParam({ name: 'eventId', description: 'Event UUID' })
    @ApiResponse({ status: 200, description: 'Event details' })
    @ApiResponse({ status: 404, description: 'Event not found' })
    async findOne(
        @Param('farmId') farmId: string,
        @Param('cowId') cowId: string,
        @Param('eventId') eventId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.cowsService.findOne(farmId, cowId);
        return this.cowEventsService.findOne(cowId, eventId);
    }

    @Patch(':eventId')
    @ApiOperation({ summary: 'Update an event' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiParam({ name: 'eventId', description: 'Event UUID' })
    @ApiResponse({ status: 200, description: 'Event updated' })
    async update(
        @Param('farmId') farmId: string,
        @Param('cowId') cowId: string,
        @Param('eventId') eventId: string,
        @Body() updateCowEventDto: UpdateCowEventDto,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.cowsService.findOne(farmId, cowId);
        return this.cowEventsService.update(cowId, eventId, updateCowEventDto);
    }

    @Delete(':eventId')
    @ApiOperation({ summary: 'Delete an event' })
    @ApiParam({ name: 'farmId', description: 'Farm UUID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiParam({ name: 'eventId', description: 'Event UUID' })
    @ApiResponse({ status: 200, description: 'Event deleted' })
    async remove(
        @Param('farmId') farmId: string,
        @Param('cowId') cowId: string,
        @Param('eventId') eventId: string,
        @CurrentUser() user: User,
    ) {
        await this.farmsService.checkMembership(farmId, user.id);
        await this.cowsService.findOne(farmId, cowId);
        await this.cowEventsService.remove(cowId, eventId);
        return { message: 'Event deleted successfully' };
    }
}
