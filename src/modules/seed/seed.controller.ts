import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { Farm } from '../../entities/farm.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { Cow } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { MilkRecord } from '../../entities/milk-record.entity';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';

@ApiTags('Seed')
@Controller('api/v1/seed')
export class SeedController {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Farm) private farmRepo: Repository<Farm>,
        @InjectRepository(FarmMembership) private membershipRepo: Repository<FarmMembership>,
        @InjectRepository(Cow) private cowRepo: Repository<Cow>,
        @InjectRepository(CowEvent) private eventRepo: Repository<CowEvent>,
        @InjectRepository(MilkRecord) private milkRepo: Repository<MilkRecord>,
        @InjectRepository(FinancialTransaction) private txRepo: Repository<FinancialTransaction>,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Seed database with sample data (DEV ONLY)' })
    async seedDatabase() {
        try {
            // Clear existing data
            await this.milkRepo.delete({});
            await this.txRepo.delete({});
            await this.eventRepo.delete({});
            await this.cowRepo.delete({});
            await this.membershipRepo.delete({});
            await this.farmRepo.delete({});
            await this.userRepo.delete({});

            const passwordHash = await bcrypt.hash('password123', 10);

            // Create users
            const owner = await this.userRepo.save({
                id: uuidv4(),
                email: 'owner@example.com',
                password: passwordHash,
                name: 'Rajesh Patil',
                phone: '+91 9876543210',
                languagePreference: 'en',
            });

            const worker = await this.userRepo.save({
                id: uuidv4(),
                email: 'worker@example.com',
                password: passwordHash,
                name: 'Suresh Kumar',
                phone: '+91 9876543211',
                languagePreference: 'en',
            });

            // Create farm
            const farm = await this.farmRepo.save({
                id: uuidv4(),
                name: 'Green Valley Dairy Farm',
                location: 'Pune, Maharashtra',
                description: 'A medium-sized dairy farm with quality Holstein and Gir cows',
                createdBy: owner.id,
            });

            // Create memberships
            await this.membershipRepo.save([
                { userId: owner.id, farmId: farm.id, role: 'owner' },
                { userId: worker.id, farmId: farm.id, role: 'worker' },
            ]);

            // Create cows
            const cowData = [
                { tagId: 'GV-001', name: 'Lakshmi', gender: 'female', breed: 'Gir', dob: '2020-03-15' },
                { tagId: 'GV-002', name: 'Ganga', gender: 'female', breed: 'Gir', dob: '2019-08-22' },
                { tagId: 'GV-003', name: 'Radha', gender: 'female', breed: 'Holstein Friesian', dob: '2021-01-10' },
                { tagId: 'GV-004', name: 'Durga', gender: 'female', breed: 'Holstein Friesian', dob: '2020-11-05' },
                { tagId: 'GV-005', name: 'Parvati', gender: 'female', breed: 'Gir', dob: '2022-02-20' },
                { tagId: 'GV-006', name: 'Saraswati', gender: 'female', breed: 'Jersey', dob: '2021-06-18' },
                { tagId: 'GV-007', name: 'Annapurna', gender: 'female', breed: 'Jersey', dob: '2020-09-12' },
                { tagId: 'GV-008', name: null, gender: 'male', breed: 'Gir', dob: '2022-05-01' },
                { tagId: 'GV-009', name: 'Kamdhenu', gender: 'female', breed: 'Sahiwal', dob: '2019-12-25' },
                { tagId: 'GV-010', name: 'Nandini', gender: 'female', breed: 'Sahiwal', dob: '2021-04-08' },
                { tagId: 'GV-011', name: 'Tulsi', gender: 'female', breed: 'Gir', dob: '2020-07-14' },
                { tagId: 'GV-012', name: 'Yamuna', gender: 'female', breed: 'Holstein Friesian', dob: '2021-09-30' },
            ];

            const cows: Cow[] = [];
            for (const data of cowData) {
                const cow = await this.cowRepo.save({
                    id: uuidv4(),
                    farmId: farm.id,
                    tagId: data.tagId,
                    name: data.name,
                    gender: data.gender as 'male' | 'female',
                    breed: data.breed,
                    dateOfBirth: new Date(data.dob),
                    acquisitionDate: new Date(data.dob),
                    lifecycleStatus: 'active',
                    acquisitionSource: 'Born on farm',
                    createdBy: owner.id,
                });
                cows.push(cow);
            }

            // Create events, milk records, and transactions
            const today = new Date();
            const femaleCows = cows.filter(c => c.gender === 'female');

            // Simplified event creation
            for (const cow of femaleCows.slice(0, 8)) {
                const vacDate = new Date(today);
                vacDate.setMonth(vacDate.getMonth() - 3);
                const nextDue = new Date(today);
                nextDue.setDate(nextDue.getDate() + 7);

                await this.eventRepo.save({
                    id: uuidv4(),
                    cowId: cow.id,
                    type: 'VACCINATION',
                    date: vacDate,
                    description: 'FMD Vaccination',
                    metadata: { vaccineName: 'FMD Vaccine', nextDueDate: nextDue.toISOString().split('T')[0] },
                    createdBy: owner.id,
                });
            }

            // Create 14 days of milk records
            for (let i = 0; i < 14; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);

                for (const cow of femaleCows) {
                    await this.milkRepo.save({
                        id: uuidv4(),
                        cowId: cow.id,
                        date,
                        milkingTime: 'AM',
                        amount: 8 + Math.random() * 6,
                        createdBy: owner.id,
                    });

                    await this.milkRepo.save({
                        id: uuidv4(),
                        cowId: cow.id,
                        date,
                        milkingTime: 'PM',
                        amount: 6 + Math.random() * 5,
                        createdBy: owner.id,
                    });
                }
            }

            // Create financial transactions
            const transactions = [
                { type: 'income', category: 'Milk Sales', amount: 45000, daysAgo: 3 },
                { type: 'income', category: 'Milk Sales', amount: 42000, daysAgo: 10 },
                { type: 'expense', category: 'Feed', amount: 25000, daysAgo: 5 },
                { type: 'expense', category: 'Veterinary', amount: 3500, daysAgo: 12 },
                { type: 'expense', category: 'Labor', amount: 15000, daysAgo: 1 },
            ];

            for (const tx of transactions) {
                const txDate = new Date(today);
                txDate.setDate(txDate.getDate() - tx.daysAgo);

                await this.txRepo.save({
                    id: uuidv4(),
                    farmId: farm.id,
                    type: tx.type as any,
                    category: tx.category as any,
                    amount: tx.amount,
                    date: txDate,
                    description: `${tx.category} transaction`,
                    createdBy: owner.id,
                });
            }

            return {
                message: 'Database seeded successfully!',
                data: {
                    users: 2,
                    farms: 1,
                    cows: cows.length,
                    events: femaleCows.slice(0, 8).length,
                    milkRecords: 14 * femaleCows.length * 2,
                    transactions: transactions.length,
                },
                testAccounts: [
                    { email: 'owner@example.com', password: 'password123' },
                    { email: 'worker@example.com', password: 'password123' },
                ],
            };
        } catch (error: any) {
            console.error('Seed error:', error);
            return {
                error: 'Seed failed',
                message: error.message,
                stack: error.stack,
            };
        }
    }
}
