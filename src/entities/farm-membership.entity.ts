import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Farm } from './farm.entity';

export type FarmRole = 'owner' | 'worker';

/**
 * Links a User to a Farm and defines their role.
 * This allows a User to be part of multiple Farms.
 */
@Entity('farm_memberships')
@Unique(['userId', 'farmId'])
export class FarmMembership {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ type: 'varchar', default: 'worker' })
    role: FarmRole;

    @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Farm, (farm) => farm.memberships, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
