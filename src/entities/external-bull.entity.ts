import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Farm } from './farm.entity';
import { User } from './user.entity';

/**
 * Represents an external bull used for artificial insemination (AI).
 * These bulls may not physically reside on the farm.
 */
@Entity('external_bulls')
@Index(['farmId', 'registrationNo'], { unique: true })
export class ExternalBull extends BaseEntity {
    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ name: 'registration_no', type: 'varchar' })
    registrationNo: string;

    @Column({ type: 'varchar', nullable: true })
    breed: string | null;

    @Column({ type: 'varchar', nullable: true })
    source: string | null; // e.g. Semen company, ABS, Semex, Straw code

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @ManyToOne(() => Farm, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}
