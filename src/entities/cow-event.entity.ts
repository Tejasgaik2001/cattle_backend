import {
    Entity,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Cow } from './cow.entity';
import { User } from './user.entity';

export type CowEventType = 'HEALTH' | 'VACCINATION' | 'BREEDING' | 'NOTE' | 'FINANCIAL';

/**
 * Metadata interfaces for different event types
 */
export interface VaccinationMetadata {
    vaccineName: string;
    nextDueDate?: string; // YYYY-MM-DD
}

export interface BreedingMetadata {
    sire: string;
    method: 'AI' | 'Natural';
    expectedCalvingDate?: string; // YYYY-MM-DD
    result?: 'confirmed' | 'failed' | 'pending';
}

export interface HealthMetadata {
    symptoms: string[];
    treatment: string;
    diagnosis: string;
    isUnderTreatment?: boolean;
    followUpDate?: string; // YYYY-MM-DD
}

export interface FinancialMetadata {
    salePrice?: number;
    buyerName?: string;
}

export type CowEventMetadata =
    | VaccinationMetadata
    | BreedingMetadata
    | HealthMetadata
    | FinancialMetadata
    | Record<string, unknown>;

/**
 * Represents a specific, point-in-time event in a cow's life.
 * Events are categorized by type and contain structured metadata.
 */
@Entity('cow_events')
export class CowEvent extends BaseEntity {
    @Column({ name: 'cow_id', type: 'uuid' })
    cowId: string;

    @Column({ type: 'varchar' })
    type: CowEventType;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: CowEventMetadata | null;

    @ManyToOne(() => Cow, (cow) => cow.events, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cow_id' })
    cow: Cow;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}
