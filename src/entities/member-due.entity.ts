import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Person } from './person.entity';
import { FinancialTransaction } from './financial-transaction.entity';

export enum MemberDueType {
    OWES_BUSINESS = 'OWES_BUSINESS', // Member received income personally
    BUSINESS_OWES = 'BUSINESS_OWES', // Member paid expense personally
}

export enum MemberDueStatus {
    PENDING = 'PENDING',
    SETTLED = 'SETTLED',
}

@Entity('member_dues')
export class MemberDue extends BaseEntity {
    @Column({ name: 'person_id', type: 'uuid' })
    personId: string;

    @Column({
        type: 'varchar',
        enum: MemberDueType,
        default: MemberDueType.BUSINESS_OWES,
    })
    type: MemberDueType;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({
        type: 'varchar',
        enum: MemberDueStatus,
        default: MemberDueStatus.PENDING,
    })
    status: MemberDueStatus;

    @Column({ name: 'linked_transaction_id', type: 'uuid', nullable: true })
    linkedTransactionId: string | null;

    @Column({ type: 'text', nullable: true })
    note: string | null;

    @Column({ name: 'settled_at', type: 'timestamp', nullable: true })
    settledAt: Date | null;

    @ManyToOne(() => Person, (person) => person.memberDues, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'person_id' })
    person: Person;

    @ManyToOne(() => FinancialTransaction, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'linked_transaction_id' })
    linkedTransaction: FinancialTransaction | null;
}
