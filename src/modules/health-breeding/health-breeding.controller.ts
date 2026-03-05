import {
    Controller,
    Get,
    Post,
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
import { HealthBreedingService } from './health-breeding.service';
import { FarmsService } from '../farms/farms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import {
    HealthBreedingOverview,
    HealthBreedingTask,
    CowHealthBreedingRow,
    CowHistory,
    CreateHealthRecordDto,
    CreateBreedingEventDto,
    CreateVaccinationRecordDto,
} from '../../dto';

@ApiTags('Health & Breeding')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/health-breeding')
@UseGuards(JwtAuthGuard)
export class HealthBreedingController {
    constructor(
        private readonly healthBreedingService: HealthBreedingService,
        private readonly farmsService: FarmsService,
    ) { }

    // ─── Existing Endpoints ────────────────────────────────────────────────

    @Get('overview')
    @ApiOperation({ summary: 'Get herd health and breeding overview metrics' })
    @ApiResponse({ status: 200, type: HealthBreedingOverview })
    async getOverview(
        @CurrentUser() user: User,
    ): Promise<HealthBreedingOverview> {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.healthBreedingService.getOverview(farmId);
    }

    @Get('tasks')
    @ApiOperation({ summary: 'Get upcoming and overdue health/breeding tasks' })
    @ApiResponse({ status: 200, type: [HealthBreedingTask] })
    async getTasks(
        @CurrentUser() user: User,
    ): Promise<HealthBreedingTask[]> {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.healthBreedingService.getTasks(farmId);
    }

    // ─── New Endpoints ─────────────────────────────────────────────────────

    @Get('cow-list')
    @ApiOperation({ summary: 'Get all active cows with their latest health & breeding status' })
    @ApiResponse({ status: 200, type: [CowHealthBreedingRow] })
    async getCowList(
        @CurrentUser() user: User,
    ): Promise<CowHealthBreedingRow[]> {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.healthBreedingService.getCowHealthBreedingList(farmId);
    }

    @Get('cows/:cowId/history')
    @ApiOperation({ summary: 'Get full health, breeding, and vaccination history for a specific cow' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiResponse({ status: 200, type: CowHistory })
    @ApiResponse({ status: 404, description: 'Cow not found' })
    async getCowHistory(
        @Param('cowId') cowId: string,
        @CurrentUser() user: User,
    ): Promise<CowHistory> {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.healthBreedingService.getCowHistory(farmId, cowId);
    }

    @Post('health-records')
    @ApiOperation({ summary: 'Create a health record for a cow' })
    @ApiResponse({ status: 201, description: 'Health record created' })
    @ApiResponse({ status: 404, description: 'Cow not found' })
    async createHealthRecord(
        @Body() dto: CreateHealthRecordDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.healthBreedingService.createHealthRecord(farmId, dto, user.id);
    }

    @Post('breeding-events')
    @ApiOperation({ summary: 'Create a breeding event for a cow (expected calving auto-calculated if pregnancy_confirmed)' })
    @ApiResponse({ status: 201, description: 'Breeding event created' })
    @ApiResponse({ status: 404, description: 'Cow not found' })
    async createBreedingEvent(
        @Body() dto: CreateBreedingEventDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.healthBreedingService.createBreedingEvent(farmId, dto, user.id);
    }

    @Post('vaccination-records')
    @ApiOperation({ summary: 'Create a vaccination record for a cow' })
    @ApiResponse({ status: 201, description: 'Vaccination record created' })
    @ApiResponse({ status: 404, description: 'Cow not found' })
    async createVaccinationRecord(
        @Body() dto: CreateVaccinationRecordDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.healthBreedingService.createVaccinationRecord(farmId, dto, user.id);
    }
}
