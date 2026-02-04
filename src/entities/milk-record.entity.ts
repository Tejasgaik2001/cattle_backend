import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Cow } from './cow.entity';
import { User } from './user.entity';

export type MilkingTime = 'AM' | 'PM';

/**
 * Represents a single milk production record for a specific Cow.
 * Unique constraint per cow, date, and milking time.
 */
@Entity('milk_records')
@Index(['cowId', 'date', 'milkingTime'], { unique: true })
export class MilkRecord extends BaseEntity {
    @Column({ name: 'cow_id', type: 'uuid' })
    cowId: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ name: 'milking_time', type: 'varchar' })
    milkingTime: MilkingTime;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number; // Liters

    @ManyToOne(() => Cow, (cow) => cow.milkRecords, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cow_id' })
    cow: Cow;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}
