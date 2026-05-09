import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Farm } from './farm.entity';

@Entity('financial_categories')
export class FinancialCategory extends BaseEntity {
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 20 })
    type: 'income' | 'expense';

    @Column({ name: 'is_system', type: 'boolean', default: false })
    isSystem: boolean; // System categories cannot be deleted

    @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;
}
