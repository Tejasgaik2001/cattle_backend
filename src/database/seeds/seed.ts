import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../entities/user.entity';
import { Farm } from '../../entities/farm.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { Cow } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { MilkRecord } from '../../entities/milk-record.entity';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';

/**
 * Seed script to populate the database with sample data
 * Run with: npx ts-node src/database/seeds/seed.ts
 */

async function seed() {
    // Verify entities are loaded
    console.log('User entity:', User);
    console.log('Farm entity:', Farm);
    console.log('FarmMembership entity:', FarmMembership);

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'mycowfarm',
        entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
        synchronize: true,
    });

    await dataSource.initialize();
    console.log('Database connected');

    // ... rest of the script ...
    const passwordHash = await bcrypt.hash('password123', 10);

    const owner = dataSource.getRepository(User).create({
        id: uuidv4(),
        email: 'owner@example.com',
        password: passwordHash,
        name: 'Rajesh Patil',
        phone: '+91 9876543210',
        languagePreference: 'en',
    });
    await dataSource.getRepository(User).save(owner);
    console.log('Created owner user:', owner.email);

    const worker = dataSource.getRepository(User).create({
        id: uuidv4(),
        email: 'worker@example.com',
        password: passwordHash,
        name: 'Suresh Kumar',
        phone: '+91 9876543211',
        languagePreference: 'en',
    });
    await dataSource.getRepository(User).save(worker);
    console.log('Created worker user:', worker.email);

    // Create farm
    const farm = dataSource.getRepository(Farm).create({
        id: uuidv4(),
        name: 'Green Valley Dairy Farm',
        location: 'Pune, Maharashtra',
        description: 'A medium-sized dairy farm with quality Holstein and Gir cows',
        createdBy: owner.id,
    });
    await dataSource.getRepository(Farm).save(farm);
    console.log('Created farm:', farm.name);

    // Create memberships
    const ownerMembership = dataSource.getRepository(FarmMembership).create({
        userId: owner.id,
        farmId: farm.id,
        role: 'owner',
    });
    await dataSource.getRepository(FarmMembership).save(ownerMembership);

    const workerMembership = dataSource.getRepository(FarmMembership).create({
        userId: worker.id,
        farmId: farm.id,
        role: 'worker',
    });
    await dataSource.getRepository(FarmMembership).save(workerMembership);
    console.log('Created memberships');

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
    ];

    const cows: Cow[] = [];
    for (const data of cowData) {
        const cow = dataSource.getRepository(Cow).create({
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
        await dataSource.getRepository(Cow).save(cow);
        cows.push(cow);
    }
    console.log(`Created ${cows.length} cows`);

    // Create cow events
    const today = new Date();
    const femaleCows = cows.filter((c) => c.gender === 'female');

    for (const cow of femaleCows.slice(0, 5)) {
        // Vaccination event
        const vaccinationDate = new Date(today);
        vaccinationDate.setMonth(vaccinationDate.getMonth() - 3);
        const nextDueDate = new Date(today);
        nextDueDate.setDate(nextDueDate.getDate() + 7);

        await dataSource.getRepository(CowEvent).save({
            id: uuidv4(),
            cowId: cow.id,
            type: 'VACCINATION',
            date: vaccinationDate,
            description: 'FMD Vaccination administered',
            metadata: {
                vaccineName: 'FMD Vaccine',
                nextDueDate: nextDueDate.toISOString().split('T')[0],
            },
            createdBy: owner.id,
        });

        // Health event for some cows
        if (Math.random() > 0.6) {
            const healthDate = new Date(today);
            healthDate.setDate(healthDate.getDate() - 5);

            await dataSource.getRepository(CowEvent).save({
                id: uuidv4(),
                cowId: cow.id,
                type: 'HEALTH',
                date: healthDate,
                description: 'Minor digestive issues',
                metadata: {
                    symptoms: ['Reduced appetite', 'Mild diarrhea'],
                    treatment: 'Oral rehydration and probiotics',
                    diagnosis: 'Mild gastroenteritis',
                    isUnderTreatment: true,
                    followUpDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                },
                createdBy: owner.id,
            });
        }

        // Breeding event for some cows
        if (Math.random() > 0.5) {
            const breedingDate = new Date(today);
            breedingDate.setMonth(breedingDate.getMonth() - 5);
            const expectedCalvingDate = new Date(breedingDate);
            expectedCalvingDate.setMonth(expectedCalvingDate.getMonth() + 9);

            await dataSource.getRepository(CowEvent).save({
                id: uuidv4(),
                cowId: cow.id,
                type: 'BREEDING',
                date: breedingDate,
                description: 'AI performed successfully',
                metadata: {
                    sire: 'Champion Bull #1234',
                    method: 'AI',
                    result: 'confirmed',
                    expectedCalvingDate: expectedCalvingDate.toISOString().split('T')[0],
                },
                createdBy: owner.id,
            });
        }
    }
    console.log('Created cow events');

    // Create milk records for last 14 days
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const recordDate = new Date(today);
        recordDate.setDate(recordDate.getDate() - dayOffset);
        const dateStr = recordDate.toISOString().split('T')[0];

        for (const cow of femaleCows) {
            // AM milking
            await dataSource.getRepository(MilkRecord).save({
                id: uuidv4(),
                cowId: cow.id,
                date: new Date(dateStr),
                milkingTime: 'AM',
                amount: 8 + Math.random() * 6, // 8-14 liters
                createdBy: owner.id,
            });

            // PM milking
            await dataSource.getRepository(MilkRecord).save({
                id: uuidv4(),
                cowId: cow.id,
                date: new Date(dateStr),
                milkingTime: 'PM',
                amount: 6 + Math.random() * 5, // 6-11 liters
                createdBy: owner.id,
            });
        }
    }
    console.log('Created milk records for last 14 days');

    // Create financial transactions
    const transactionData = [
        { type: 'income', category: 'Milk Sales', amount: 45000, description: 'Weekly milk sale to dairy', daysAgo: 3 },
        { type: 'income', category: 'Milk Sales', amount: 42000, description: 'Weekly milk sale to dairy', daysAgo: 10 },
        { type: 'expense', category: 'Feed', amount: 25000, description: 'Cattle feed - monthly supply', daysAgo: 5 },
        { type: 'expense', category: 'Veterinary', amount: 3500, description: 'Vaccination and checkup', daysAgo: 12 },
        { type: 'expense', category: 'Labor', amount: 15000, description: 'Worker salaries', daysAgo: 1 },
        { type: 'expense', category: 'Utilities', amount: 5000, description: 'Electricity and water', daysAgo: 7 },
        { type: 'expense', category: 'Breeding / AI', amount: 2000, description: 'AI services', daysAgo: 20 },
        { type: 'income', category: 'Other Income', amount: 5000, description: 'Manure sale', daysAgo: 15 },
    ];

    for (const tx of transactionData) {
        const txDate = new Date(today);
        txDate.setDate(txDate.getDate() - tx.daysAgo);

        await dataSource.getRepository(FinancialTransaction).save({
            id: uuidv4(),
            farmId: farm.id,
            type: tx.type as 'expense' | 'income',
            category: tx.category as any,
            amount: tx.amount,
            date: txDate,
            description: tx.description,
            createdBy: owner.id,
        });
    }
    console.log('Created financial transactions');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Test accounts:');
    console.log('   Owner: owner@example.com / password123');
    console.log('   Worker: worker@example.com / password123');

    await dataSource.destroy();
}

seed().catch((error) => {
    console.error('Seed error:', JSON.stringify(error, null, 2));
    process.exit(1);
});
