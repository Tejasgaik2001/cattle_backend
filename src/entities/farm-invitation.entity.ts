import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    PrimaryGeneratedColumn,
    CreateDateColumn,
} from 'typeorm';
import { Farm } from './farm.entity';

/**
 * Represents an invitation to join a farm.
 * Uses a unique token for secure acceptance.
 */
@Entity('farm_invitations')
export class FarmInvitation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column()
    email: string;

    @Column({ type: 'varchar', default: 'worker' })
    role: 'owner' | 'worker';

    @Column({ unique: true })
    token: string;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;

    @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
    acceptedAt: Date | null;

    @ManyToOne(() => Farm, (farm) => farm.invitations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
