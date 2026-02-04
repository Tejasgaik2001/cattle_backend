import {
    Entity,
    Column,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { FarmMembership } from './farm-membership.entity';
import { Cow } from './cow.entity';
import { FinancialTransaction } from './financial-transaction.entity';
import { User } from './user.entity';
import { FarmInvitation } from './farm-invitation.entity';

/**
 * Represents the entire farming operation.
 * It is the top-level container for all cows, users, and financial data.
 */
@Entity('farms')
export class Farm extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    location: string | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @OneToMany(() => FarmMembership, (membership) => membership.farm)
    memberships: FarmMembership[];

    @OneToMany(() => Cow, (cow) => cow.farm)
    cows: Cow[];

    @OneToMany(() => FinancialTransaction, (transaction) => transaction.farm)
    financialTransactions: FinancialTransaction[];

    @OneToMany(() => FarmInvitation, (invitation) => invitation.farm)
    invitations: FarmInvitation[];

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}
