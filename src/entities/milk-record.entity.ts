import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Farm } from './farm.entity';
import { Cow } from './cow.entity';
import { User } from './user.entity';


export type MilkingTime = 'AM' | 'PM';

/**
 * Represents a milk production record.
 * Can be for a specific Cow or a Bulk/Collective entry for the farm.
 */
@Entity('milk_records')
@Index(['cowId', 'farmId', 'date', 'milkingTime'], { unique: true })
export class MilkRecord extends BaseEntity {
    @Column({ name: 'cow_id', type: 'uuid', nullable: true })
    cowId: string | null;

    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;



    @Column({ type: 'date' })
    date: Date;

    @Column({ name: 'milking_time', type: 'varchar' })
    milkingTime: MilkingTime;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number; // Liters

    @Column({ name: 'is_bulk', type: 'boolean', default: false })
    isBulk: boolean;

    @Column({ name: 'price_per_liter', type: 'decimal', precision: 10, scale: 2, nullable: true })
    pricePerLiter: number | null;

    @Column({ name: 'total_value', type: 'decimal', precision: 12, scale: 2, nullable: true })
    totalValue: number | null;

    @Column({ name: 'dairy_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
    dairyAmount: number | null;

    @Column({ name: 'dairy_price_per_liter', type: 'decimal', precision: 10, scale: 2, nullable: true })
    dairyPricePerLiter: number | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    fat: number | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    snf: number | null;

    @Column({ name: 'dairy_fat', type: 'decimal', precision: 5, scale: 2, nullable: true })
    dairyFat: number | null;

    @Column({ name: 'dairy_snf', type: 'decimal', precision: 5, scale: 2, nullable: true })
    dairySnf: number | null;

    @Column({ name: 'is_reconciled', type: 'boolean', default: false })
    isReconciled: boolean;

    @Column({ name: 'notes', type: 'text', nullable: true })
    notes: string | null;




    @ManyToOne(() => Cow, (cow) => cow.milkRecords, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'cow_id' })
    cow: Cow | null;

    @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}

