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
import { CowsService } from './cows.service';
import { FarmsService } from '../farms/farms.service';
import { CreateCowDto, UpdateCowDto, UpdateLifecycleStatusDto, CowFilterDto } from '../../dto/cow';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Cows')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/cows')
@UseGuards(JwtAuthGuard)
export class CowsController {
    constructor(
        private readonly cowsService: CowsService,
        private readonly farmsService: FarmsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Add a new cow to the farm' })
    @ApiResponse({ status: 201, description: 'Cow created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 409, description: 'Tag ID already exists' })
    async create(
        @Body() createCowDto: CreateCowDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.cowsService.create(farmId, createCowDto, user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all cows with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Paginated list of cows' })
    async findAll(
        @Query() filterDto: CowFilterDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.cowsService.findAll(farmId, filterDto);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get herd statistics (count by status)' })
    @ApiResponse({ status: 200, description: 'Herd statistics' })
    async getStats(
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const counts = await this.cowsService.getCountByStatus(farmId);
        return {
            total: counts.active + counts.sold + counts.deceased,
            active: counts.active,
            sold: counts.sold,
            deceased: counts.deceased,
        };
    }

    @Get('active-females')
    @ApiOperation({ summary: 'Get active female cows (for milk record dropdowns)' })
    @ApiResponse({ status: 200, description: 'List of active female cows' })
    async getActiveFemales(
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        const cows = await this.cowsService.getActiveFemales(farmId);
        return cows.map((cow) => ({
            id: cow.id,
            tagId: cow.tagId,
            name: cow.name,
        }));
    }

    @Get(':cowId')
    @ApiOperation({ summary: 'Get cow details by ID' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiResponse({ status: 200, description: 'Cow details with mother info' })
    @ApiResponse({ status: 404, description: 'Cow not found' })
    async findOne(
        @Param('cowId') cowId: string,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.cowsService.findOne(farmId, cowId);
    }

    @Patch(':cowId')
    @ApiOperation({ summary: 'Update cow information' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiResponse({ status: 200, description: 'Cow updated successfully' })
    async update(
        @Param('cowId') cowId: string,
        @Body() updateCowDto: UpdateCowDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.cowsService.update(farmId, cowId, updateCowDto, user.id);
    }

    @Patch(':cowId/lifecycle')
    @ApiOperation({ summary: 'Update cow lifecycle status (active/sold/deceased)' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiResponse({ status: 200, description: 'Lifecycle status updated' })
    async updateLifecycleStatus(
        @Param('cowId') cowId: string,
        @Body() updateStatusDto: UpdateLifecycleStatusDto,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.cowsService.updateLifecycleStatus(farmId, cowId, updateStatusDto);
    }

    @Delete(':cowId')
    @ApiOperation({ summary: 'Delete a cow (owner only)' })
    @ApiParam({ name: 'cowId', description: 'Cow UUID' })
    @ApiResponse({ status: 200, description: 'Cow deleted successfully' })
    @ApiResponse({ status: 403, description: 'Only owners can delete cows' })
    async remove(
        @Param('cowId') cowId: string,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        await this.cowsService.remove(farmId, cowId);
        return { message: 'Cow deleted successfully' };
    }
}
