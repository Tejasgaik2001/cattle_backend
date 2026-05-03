import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Farm } from './farm.entity';
import { Cow } from './cow.entity';
import { User } from './user.entity';
import { Person } from './person.entity';

/**
 * Represents any financial activity for the Farm.
 * Can be either an expense or income, with specific categories.
 * paid_by_id tracks which person (owner/family/worker) made the payment.
 */
@Entity('financial_transactions')
export class FinancialTransaction extends BaseEntity {
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ type: 'varchar' })
    type: 'expense' | 'income';

    @Column({ type: 'varchar' })
    category: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number; // INR

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ name: 'cow_id', type: 'uuid', nullable: true })
    cowId: string | null; // Optional: for transactions related to a specific cow

    @Column({ name: 'paid_by_id', type: 'uuid', nullable: true })
    paidById: string | null; // Who physically paid this

    @ManyToOne(() => Farm, (farm) => farm.financialTransactions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @ManyToOne(() => Cow, (cow) => cow.financialTransactions, {
        nullable: true,
        onDelete: 'SET NULL'
    })
    @JoinColumn({ name: 'cow_id' })
    cow: Cow | null;

    @ManyToOne(() => Person, (person) => person.transactions, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'paid_by_id' })
    paidBy: Person | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}

