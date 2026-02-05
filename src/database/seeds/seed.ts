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
 * Comprehensive seed script to populate the database with realistic sample data
 * Run with: npm run seed
 */

async function seed() {
    console.log('🌱 Starting database seeding...\n');

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
    console.log('✅ Database connected\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await dataSource.getRepository(MilkRecord).delete({});
    await dataSource.getRepository(FinancialTransaction).delete({});
    await dataSource.getRepository(CowEvent).delete({});
    await dataSource.getRepository(Cow).delete({});
    await dataSource.getRepository(FarmMembership).delete({});
    await dataSource.getRepository(Farm).delete({});
    await dataSource.getRepository(User).delete({});
    console.log('✅ Existing data cleared\n');

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create users
    console.log('👤 Creating users...');
    const owner = dataSource.getRepository(User).create({
        id: uuidv4(),
        email: 'owner@example.com',
        password: passwordHash,
        name: 'Rajesh Patil',
        phone: '+91 9876543210',
        languagePreference: 'en',
    });
    await dataSource.getRepository(User).save(owner);

    const worker = dataSource.getRepository(User).create({
        id: uuidv4(),
        email: 'worker@example.com',
        password: passwordHash,
        name: 'Suresh Kumar',
        phone: '+91 9876543211',
        languagePreference: 'en',
    });
    await dataSource.getRepository(User).save(worker);
    console.log(`✅ Created ${2} users\n`);

    // Create farm
    console.log('🏡 Creating farm...');
    const farm = dataSource.getRepository(Farm).create({
        id: uuidv4(),
        name: 'Green Valley Dairy Farm',
        location: 'Pune, Maharashtra',
        description: 'A medium-sized dairy farm with quality Holstein and Gir cows',
        createdBy: owner.id,
    });
    await dataSource.getRepository(Farm).save(farm);
    console.log(`✅ Created farm: ${farm.name}\n`);

    // Create memberships
    console.log('🤝 Creating memberships...');
    await dataSource.getRepository(FarmMembership).save([
        { userId: owner.id, farmId: farm.id, role: 'owner' },
        { userId: worker.id, farmId: farm.id, role: 'worker' },
    ]);
    console.log('✅ Created memberships\n');

    // Create cows with more variety
    console.log('🐄 Creating cows...');
    const cowData = [
        { tagId: 'GV-001', name: 'Lakshmi', gender: 'female', breed: 'Gir', dob: '2020-03-15', source: 'Born on farm' },
        { tagId: 'GV-002', name: 'Ganga', gender: 'female', breed: 'Gir', dob: '2019-08-22', source: 'Purchased' },
        { tagId: 'GV-003', name: 'Radha', gender: 'female', breed: 'Holstein Friesian', dob: '2021-01-10', source: 'Born on farm' },
        { tagId: 'GV-004', name: 'Durga', gender: 'female', breed: 'Holstein Friesian', dob: '2020-11-05', source: 'Purchased' },
        { tagId: 'GV-005', name: 'Parvati', gender: 'female', breed: 'Gir', dob: '2022-02-20', source: 'Born on farm' },
        { tagId: 'GV-006', name: 'Saraswati', gender: 'female', breed: 'Jersey', dob: '2021-06-18', source: 'Purchased' },
        { tagId: 'GV-007', name: 'Annapurna', gender: 'female', breed: 'Jersey', dob: '2020-09-12', source: 'Born on farm' },
        { tagId: 'GV-008', name: null, gender: 'male', breed: 'Gir', dob: '2022-05-01', source: 'Born on farm' },
        { tagId: 'GV-009', name: 'Kamdhenu', gender: 'female', breed: 'Sahiwal', dob: '2019-12-25', source: 'Purchased' },
        { tagId: 'GV-010', name: 'Nandini', gender: 'female', breed: 'Sahiwal', dob: '2021-04-08', source: 'Born on farm' },
        { tagId: 'GV-011', name: 'Tulsi', gender: 'female', breed: 'Gir', dob: '2020-07-14', source: 'Purchased' },
        { tagId: 'GV-012', name: 'Yamuna', gender: 'female', breed: 'Holstein Friesian', dob: '2021-09-30', source: 'Born on farm' },
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
            acquisitionSource: data.source,
            createdBy: owner.id,
        });
        await dataSource.getRepository(Cow).save(cow);
        cows.push(cow);
    }
    console.log(`✅ Created ${cows.length} cows\n`);

    // Create comprehensive cow events
    console.log('📋 Creating cow events...');
    const today = new Date();
    const femaleCows = cows.filter((c) => c.gender === 'female');
    let eventCount = 0;

    for (const cow of femaleCows) {
        // Vaccination events (all cows)
        const vaccinationDate = new Date(today);
        vaccinationDate.setMonth(vaccinationDate.getMonth() - 3);
        const nextDueDate = new Date(today);
        nextDueDate.setDate(nextDueDate.getDate() + (Math.random() > 0.5 ? 7 : -2)); // Some overdue

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
        eventCount++;

        // Health events for some cows
        if (Math.random() > 0.6) {
            const healthDate = new Date(today);
            healthDate.setDate(healthDate.getDate() - Math.floor(Math.random() * 10));
            const followUpDate = new Date(today);
            followUpDate.setDate(followUpDate.getDate() + Math.floor(Math.random() * 5));

            await dataSource.getRepository(CowEvent).save({
                id: uuidv4(),
                cowId: cow.id,
                type: 'HEALTH',
                date: healthDate,
                description: 'Health checkup and treatment',
                metadata: {
                    symptoms: ['Reduced appetite', 'Mild fever'],
                    treatment: 'Antibiotics and rest',
                    diagnosis: 'Minor infection',
                    isUnderTreatment: Math.random() > 0.5,
                    followUpDate: followUpDate.toISOString().split('T')[0],
                },
                createdBy: owner.id,
            });
            eventCount++;
        }

        // Breeding events for some cows
        if (Math.random() > 0.4) {
            const breedingDate = new Date(today);
            breedingDate.setMonth(breedingDate.getMonth() - Math.floor(Math.random() * 6));
            const expectedCalvingDate = new Date(breedingDate);
            expectedCalvingDate.setMonth(expectedCalvingDate.getMonth() + 9);

            await dataSource.getRepository(CowEvent).save({
                id: uuidv4(),
                cowId: cow.id,
                type: 'BREEDING',
                date: breedingDate,
                description: 'AI performed successfully',
                metadata: {
                    sire: `Champion Bull #${Math.floor(Math.random() * 9999)}`,
                    method: Math.random() > 0.7 ? 'Natural' : 'AI',
                    result: Math.random() > 0.3 ? 'confirmed' : 'pending',
                    expectedCalvingDate: expectedCalvingDate.toISOString().split('T')[0],
                },
                createdBy: owner.id,
            });
            eventCount++;
        }

        // Add some note events
        if (Math.random() > 0.7) {
            const noteDate = new Date(today);
            noteDate.setDate(noteDate.getDate() - Math.floor(Math.random() * 30));

            await dataSource.getRepository(CowEvent).save({
                id: uuidv4(),
                cowId: cow.id,
                type: 'NOTE',
                date: noteDate,
                description: 'General observation note',
                metadata: {},
                createdBy: owner.id,
            });
            eventCount++;
        }
    }
    console.log(`✅ Created ${eventCount} cow events\n`);

    // Create milk records for last 30 days
    console.log('🥛 Creating milk records...');
    let milkRecordCount = 0;
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const recordDate = new Date(today);
        recordDate.setDate(recordDate.getDate() - dayOffset);
        const dateStr = recordDate.toISOString().split('T')[0];

        for (const cow of femaleCows) {
            // Vary milk production by breed and randomness
            const baseProduction = cow.breed === 'Holstein Friesian' ? 12 :
                cow.breed === 'Jersey' ? 10 : 8;

            // AM milking
            await dataSource.getRepository(MilkRecord).save({
                id: uuidv4(),
                cowId: cow.id,
                date: new Date(dateStr),
                milkingTime: 'AM',
                amount: baseProduction + Math.random() * 4 - 2, // ±2 liters variation
                createdBy: owner.id,
            });
            milkRecordCount++;

            // PM milking (slightly less)
            await dataSource.getRepository(MilkRecord).save({
                id: uuidv4(),
                cowId: cow.id,
                date: new Date(dateStr),
                milkingTime: 'PM',
                amount: (baseProduction * 0.8) + Math.random() * 3 - 1.5,
                createdBy: owner.id,
            });
            milkRecordCount++;
        }
    }
    console.log(`✅ Created ${milkRecordCount} milk records (30 days)\n`);

    // Create comprehensive financial transactions
    console.log('💰 Creating financial transactions...');
    const transactionData = [
        // Income
        { type: 'income', category: 'Milk Sales', amount: 48000, description: 'Weekly milk sale to dairy', daysAgo: 2 },
        { type: 'income', category: 'Milk Sales', amount: 45000, description: 'Weekly milk sale to dairy', daysAgo: 9 },
        { type: 'income', category: 'Milk Sales', amount: 47000, description: 'Weekly milk sale to dairy', daysAgo: 16 },
        { type: 'income', category: 'Milk Sales', amount: 46000, description: 'Weekly milk sale to dairy', daysAgo: 23 },
        { type: 'income', category: 'Cow Sales', amount: 35000, description: 'Sold male calf', daysAgo: 18 },
        { type: 'income', category: 'Other Income', amount: 5000, description: 'Manure sale', daysAgo: 12 },
        { type: 'income', category: 'Other Income', amount: 3000, description: 'Manure sale', daysAgo: 25 },

        // Expenses
        { type: 'expense', category: 'Feed', amount: 28000, description: 'Cattle feed - monthly supply', daysAgo: 3 },
        { type: 'expense', category: 'Feed', amount: 26000, description: 'Cattle feed - monthly supply', daysAgo: 28 },
        { type: 'expense', category: 'Veterinary', amount: 4500, description: 'Vaccination campaign', daysAgo: 8 },
        { type: 'expense', category: 'Veterinary', amount: 2500, description: 'Health checkup', daysAgo: 15 },
        { type: 'expense', category: 'Labor', amount: 15000, description: 'Worker salaries', daysAgo: 1 },
        { type: 'expense', category: 'Labor', amount: 15000, description: 'Worker salaries', daysAgo: 30 },
        { type: 'expense', category: 'Utilities', amount: 5500, description: 'Electricity and water', daysAgo: 5 },
        { type: 'expense', category: 'Utilities', amount: 5200, description: 'Electricity and water', daysAgo: 27 },
        { type: 'expense', category: 'Breeding / AI', amount: 2500, description: 'AI services for 5 cows', daysAgo: 14 },
        { type: 'expense', category: 'Maintenance', amount: 8000, description: 'Shed repairs', daysAgo: 20 },
        { type: 'expense', category: 'Other Expenses', amount: 3000, description: 'Miscellaneous supplies', daysAgo: 10 },
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
    console.log(`✅ Created ${transactionData.length} financial transactions\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Database seeded successfully!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 Test accounts:');
    console.log('   👤 Owner:  owner@example.com  / password123');
    console.log('   👤 Worker: worker@example.com / password123\n');
    console.log('📊 Data Summary:');
    console.log(`   🐄 Cows: ${cows.length}`);
    console.log(`   📋 Events: ${eventCount}`);
    console.log(`   🥛 Milk Records: ${milkRecordCount}`);
    console.log(`   💰 Transactions: ${transactionData.length}\n`);

    await dataSource.destroy();
}

seed().catch((error) => {
    console.error('❌ Seed error:', error);
    process.exit(1);
});
