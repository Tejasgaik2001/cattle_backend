import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
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
import { PeopleService } from './people.service';
import { FarmsService } from '../farms/farms.service';
import { CreatePersonDto } from '../../dto/people/create-person.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('People')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/people')
@UseGuards(JwtAuthGuard)
export class PeopleController {
    constructor(
        private readonly peopleService: PeopleService,
        private readonly farmsService: FarmsService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a person for expense tracking' })
    @ApiResponse({ status: 201, description: 'Person created' })
    async create(@Body() dto: CreatePersonDto, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.peopleService.create(farmId, dto, user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all people for the farm' })
    @ApiResponse({ status: 200, description: 'List of people' })
    async findAll(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.peopleService.findAll(farmId);
    }

    @Post('ensure-owner')
    @ApiOperation({ summary: 'Ensure an Owner person exists (auto-create if not)' })
    @ApiResponse({ status: 200, description: 'Owner person record' })
    async ensureOwner(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return this.peopleService.ensureOwnerExists(farmId, user.name, user.id);
    }

    @Patch(':personId')
    @ApiOperation({ summary: 'Update a person' })
    @ApiParam({ name: 'personId', description: 'Person UUID' })
    async update(
        @Param('personId') personId: string,
        @Body() dto: Partial<CreatePersonDto>,
        @CurrentUser() user: User,
    ) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        return this.peopleService.update(farmId, personId, dto, user.id);
    }

    @Delete(':personId')
    @ApiOperation({ summary: 'Delete a person' })
    @ApiParam({ name: 'personId', description: 'Person UUID' })
    async remove(@Param('personId') personId: string, @CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        await this.farmsService.checkOwnership(farmId, user.id);
        await this.peopleService.remove(farmId, personId);
        return { message: 'Person deleted successfully' };
    }
}
