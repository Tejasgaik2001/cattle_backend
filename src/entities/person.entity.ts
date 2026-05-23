import {
    Entity,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Farm } from './farm.entity';
import { MemberDue } from './member-due.entity';


export type PersonRole = 'owner' | 'family' | 'worker';

/**
 * Represents a person (owner, family member, or worker) who can be
 * attributed as having paid for a financial transaction.
 */
@Entity('people')
export class Person extends BaseEntity {
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 50, default: 'worker' })
    role: PersonRole;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @ManyToOne(() => Farm, (farm) => farm.people, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    // Note: transactions relationship removed as paidBy was removed from FinancialTransaction
    // to allow both Person and User IDs in paidById

    @OneToMany(() => MemberDue, (due) => due.person)
    memberDues: MemberDue[];
}
