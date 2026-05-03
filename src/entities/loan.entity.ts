import {
    Entity,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Farm } from './farm.entity';
import { LoanPayment } from './loan-payment.entity';

export type LoanType = 'simple' | 'compound';
export type LoanStatus = 'active' | 'closed';

/**
 * Represents a loan taken by the farm (from a bank or individual).
 */
@Entity('loans')
export class Loan extends BaseEntity {
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ name: 'lender_name', type: 'varchar', length: 255 })
    lenderName: string;

    @Column({
        name: 'principal_amount',
        type: 'decimal',
        precision: 14,
        scale: 2,
    })
    principalAmount: number;

    @Column({
        name: 'interest_rate',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0,
    })
    interestRate: number; // Annual % rate

    @Column({ name: 'start_date', type: 'date' })
    startDate: Date;

    @Column({ type: 'varchar', length: 20, default: 'simple' })
    type: LoanType;

    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: LoanStatus;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @ManyToOne(() => Farm, (farm) => farm.loans, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @OneToMany(() => LoanPayment, (payment) => payment.loan, { cascade: true })
    payments: LoanPayment[];
}
