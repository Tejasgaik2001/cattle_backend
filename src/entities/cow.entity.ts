import {
    Entity,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Farm } from './farm.entity';
import { CowEvent } from './cow-event.entity';
import { MilkRecord } from './milk-record.entity';
import { FinancialTransaction } from './financial-transaction.entity';
import { User } from './user.entity';

export type CowGender = 'male' | 'female';
export type CowLifecycleStatus = 'active' | 'sold' | 'deceased';

/**
 * Represents a single animal in the herd, belonging to a specific Farm.
 * It holds the core profile and is the center of most tracking.
 */
@Entity('cows')
@Index(['farmId', 'tagId'], { unique: true }) // Tag ID must be unique per farm
export class Cow extends BaseEntity {
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ name: 'tag_id', type: 'varchar' })
    tagId: string;

    @Column({ type: 'varchar', nullable: true })
    name: string | null;

    @Column({ type: 'varchar' })
    gender: CowGender;

    @Column({ type: 'varchar', nullable: true })
    breed: string | null;

    @Column({ name: 'date_of_birth', type: 'date' })
    dateOfBirth: Date;

    @Column({ name: 'acquisition_date', type: 'date' })
    acquisitionDate: Date;

    @Column({ name: 'lifecycle_status', type: 'varchar', default: 'active' })
    lifecycleStatus: CowLifecycleStatus;

    @Column({ name: 'acquisition_source', type: 'varchar', nullable: true })
    acquisitionSource: string | null;

    @Column({ name: 'acquisition_cost', type: 'decimal', nullable: true, precision: 10, scale: 2 })
    acquisitionCost: number | null;

    // Sale information (when cow is sold)
    @Column({ name: 'sold_to', type: 'varchar', nullable: true })
    soldTo: string | null;

    @Column({ name: 'sold_price', type: 'decimal', nullable: true, precision: 10, scale: 2 })
    soldPrice: number | null;

    @Column({ name: 'sold_date', type: 'date', nullable: true })
    soldDate: Date | null;

    @Column({ name: 'sold_description', type: 'text', nullable: true })
    soldDescription: string | null;

    @Column({ name: 'mother_id', type: 'uuid', nullable: true })
    motherId: string | null;

    @Column({ name: 'photo_url', type: 'varchar', nullable: true })
    photoUrl: string | null;

    @ManyToOne(() => Farm, (farm) => farm.cows, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @ManyToOne(() => Cow, { nullable: true })
    @JoinColumn({ name: 'mother_id' })
    mother: Cow | null;

    @OneToMany(() => CowEvent, (event) => event.cow)
    events: CowEvent[];

    @OneToMany(() => MilkRecord, (record) => record.cow)
    milkRecords: MilkRecord[];

    @OneToMany(() => FinancialTransaction, (transaction) => transaction.cow)
    financialTransactions: FinancialTransaction[];

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}
