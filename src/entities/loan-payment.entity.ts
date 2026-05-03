import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Loan } from './loan.entity';

/**
 * Represents a single payment made towards a loan.
 * Tracks total paid, interest portion, and principal portion separately.
 */
@Entity('loan_payments')
export class LoanPayment extends BaseEntity {
    @Column({ name: 'loan_id', type: 'uuid' })
    loanId: string;

    @Column({ name: 'payment_date', type: 'date' })
    paymentDate: Date;

    @Column({
        name: 'amount_paid',
        type: 'decimal',
        precision: 14,
        scale: 2,
    })
    amountPaid: number;

    @Column({
        name: 'interest_component',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    })
    interestComponent: number;

    @Column({
        name: 'principal_component',
        type: 'decimal',
        precision: 14,
        scale: 2,
        default: 0,
    })
    principalComponent: number;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @ManyToOne(() => Loan, (loan) => loan.payments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'loan_id' })
    loan: Loan;
}
