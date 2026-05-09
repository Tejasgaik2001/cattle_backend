import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Farm } from './farm.entity';

@Entity('report_downloads')
export class ReportDownload {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'farm_id', type: 'uuid' })
    farmId: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @Column()
    reportType: string; // e.g., 'milk-production', 'financial'

    @Column({ type: 'jsonb', nullable: true })
    parameters: any; // Query params used

    @Column()
    format: string; // 'excel', 'csv', 'pdf'

    @Column({ nullable: true })
    fileName: string;

    @Column({ nullable: true })
    fileSize: number;

    @Column({ default: 'completed' })
    status: 'pending' | 'completed' | 'failed';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Farm)
    @JoinColumn({ name: 'farm_id' })
    farm: Farm;
}
