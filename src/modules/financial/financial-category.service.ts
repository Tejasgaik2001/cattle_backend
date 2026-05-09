import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialCategory } from '../../entities/financial-category.entity';

@Injectable()
export class FinancialCategoryService {
    constructor(
        @InjectRepository(FinancialCategory)
        private readonly categoryRepository: Repository<FinancialCategory>,
    ) {}

    async findAll(farmId: string): Promise<FinancialCategory[]> {
        const categories = await this.categoryRepository.find({
            where: { farmId },
            order: { isSystem: 'DESC', name: 'ASC' },
        });

        // If no categories found, seed defaults
        if (categories.length === 0) {
            return await this.seedDefaults(farmId);
        }

        return categories;
    }

    async create(farmId: string, name: string, type: 'income' | 'expense'): Promise<FinancialCategory> {
        const existing = await this.categoryRepository.findOne({
            where: { farmId, name, type }
        });

        if (existing) {
            throw new ConflictException(`Category "${name}" already exists for ${type}`);
        }

        const category = this.categoryRepository.create({
            farmId,
            name,
            type,
            isSystem: false
        });

        return await this.categoryRepository.save(category);
    }

    async remove(farmId: string, id: string): Promise<void> {
        const category = await this.categoryRepository.findOne({
            where: { id, farmId }
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        if (category.isSystem) {
            throw new ConflictException('System categories cannot be deleted');
        }

        await this.categoryRepository.remove(category);
    }

    private async seedDefaults(farmId: string): Promise<FinancialCategory[]> {
        const defaults: Partial<FinancialCategory>[] = [
            // Expenses
            { name: 'Feed', type: 'expense', isSystem: true },
            { name: 'Medical', type: 'expense', isSystem: true },
            { name: 'Labor', type: 'expense', isSystem: true },
            { name: 'Infrastructure', type: 'expense', isSystem: true },
            { name: 'Veterinary', type: 'expense', isSystem: true },
            { name: 'Breeding / AI', type: 'expense', isSystem: true },
            { name: 'Utilities', type: 'expense', isSystem: true },
            { name: 'Maintenance', type: 'expense', isSystem: true },
            { name: 'Other', type: 'expense', isSystem: true },
            // Income
            { name: 'Milk Sales', type: 'income', isSystem: true },
            { name: 'Cow Sales', type: 'income', isSystem: true },
            { name: 'Cow Dung Sales', type: 'income', isSystem: true },
            { name: 'Other Income', type: 'income', isSystem: true },
        ];

        const entities = defaults.map(d => this.categoryRepository.create({ ...d, farmId }));
        await this.categoryRepository.save(entities);

        return await this.findAll(farmId);
    }
}
