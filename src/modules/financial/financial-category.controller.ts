import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FinancialCategoryService } from './financial-category.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';
import { FarmsService } from '../farms/farms.service';

@Controller('financial-categories')
@UseGuards(JwtAuthGuard)
export class FinancialCategoryController {
    constructor(
        private readonly categoryService: FinancialCategoryService,
        private readonly farmsService: FarmsService
    ) {}

    @Get()
    async findAll(@CurrentUser() user: User) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return await this.categoryService.findAll(farmId);
    }

    @Post()
    async create(@CurrentUser() user: User, @Body() body: { name: string; type: 'income' | 'expense' }) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return await this.categoryService.create(farmId, body.name, body.type);
    }

    @Delete(':id')
    async remove(@CurrentUser() user: User, @Param('id') id: string) {
        const farmId = await this.farmsService.getDefaultFarmForUser(user.id);
        return await this.categoryService.remove(farmId, id);
    }
}
