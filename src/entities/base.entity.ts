import {
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Column,
} from 'typeorm';

/**
 * Base entity with common audit fields.
 * All entities should extend this class.
 */
export abstract class BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'created_by', type: 'uuid', nullable: true })
    createdBy: string | null;
}
