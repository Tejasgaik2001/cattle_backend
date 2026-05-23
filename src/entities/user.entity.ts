import {
    Entity,
    Column,
    OneToMany,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { FarmMembership } from './farm-membership.entity';
import { Exclude } from 'class-transformer';

export type GlobalRole = 'super_admin' | 'admin' | 'sub_admin' | 'worker';

/**
 * Represents an individual person who can access the system.
 */
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    @Exclude()
    password: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
    phone: string | null;

    @Column({ name: 'photo_url', type: 'text', nullable: true })
    photoUrl: string | null;

    @Column({ name: 'language_preference', type: 'varchar', length: 10, default: 'en' })
    languagePreference: string;

    @Column({ 
        name: 'global_role', 
        type: 'enum', 
        enum: ['super_admin', 'admin', 'sub_admin', 'worker'],
        default: 'worker' 
    })
    globalRole: GlobalRole;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'refresh_token', type: 'text', nullable: true })
    @Exclude()
    refreshToken: string | null;

    @OneToMany(() => FarmMembership, (membership) => membership.user)
    memberships: FarmMembership[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
