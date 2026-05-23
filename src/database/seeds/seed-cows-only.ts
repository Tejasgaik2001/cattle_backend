import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Cow } from '../../entities/cow.entity';
import { User } from '../../entities/user.entity';
import { Farm } from '../../entities/farm.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';

/**
 * Seed script to populate the database with cows only
 * Also creates a default farm and user if they don't exist
 * Run with: npm run seed:cows
 */
async function seedCows() {
    console.log('🌱 Starting cows-only database seeding...\n');

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

    // Clear cows only
    console.log('🗑️  Clearing cows...');
    await dataSource.query('TRUNCATE TABLE "cows" CASCADE');
    console.log('✅ Cows cleared\n');

    const passwordHash = await bcrypt.hash('password123', 10);

    // Create default user if not exists
    console.log('👤 Creating default user...');
    const userResult = await dataSource.query('SELECT id FROM "users" LIMIT 1');
    let userId;
    if (userResult.length === 0) {
        const user = dataSource.getRepository(User).create({
            id: uuidv4(),
            email: 'admin@example.com',
            password: passwordHash,
            name: 'Admin User',
            phone: '+91 9876543210',
            languagePreference: 'en',
            globalRole: 'super_admin',
            isActive: true,
        });
        await dataSource.getRepository(User).save(user);
        userId = user.id;
        console.log(`✅ Created default user: ${user.email}\n`);
    } else {
        userId = userResult[0].id;
        console.log(`✅ Using existing user\n`);
    }

    // Create default farm if not exists
    console.log('🏡 Creating default farm...');
    const farmResult = await dataSource.query('SELECT id FROM "farms" LIMIT 1');
    let farmId;
    if (farmResult.length === 0) {
        const farm = dataSource.getRepository(Farm).create({
            id: uuidv4(),
            name: 'My Dairy Farm',
            location: 'Default Location',
            description: 'Default farm for testing',
            createdBy: userId,
        });
        await dataSource.getRepository(Farm).save(farm);
        farmId = farm.id;
        console.log(`✅ Created default farm: ${farm.name}\n`);
    } else {
        farmId = farmResult[0].id;
        console.log(`✅ Using existing farm\n`);
    }

    // Create membership if not exists
    console.log('🤝 Creating membership...');
    const membershipResult = await dataSource.query('SELECT * FROM "farm_memberships" WHERE "user_id" = $1 AND "farm_id" = $2', [userId, farmId]);
    if (membershipResult.length === 0) {
        await dataSource.getRepository(FarmMembership).save({
            userId: userId,
            farmId: farmId,
            role: 'owner',
        });
        console.log(`✅ Created membership\n`);
    }

    // Create cows
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
            farmId: farmId,
            tagId: data.tagId,
            name: data.name,
            gender: data.gender as 'male' | 'female',
            breed: data.breed,
            dateOfBirth: new Date(data.dob),
            acquisitionDate: new Date(data.dob),
            lifecycleStatus: 'active',
            acquisitionSource: data.source,
            createdBy: userId,
        });
        await dataSource.getRepository(Cow).save(cow);
        cows.push(cow);
    }
    console.log(`✅ Created ${cows.length} cows\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Cows seeded successfully!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 Test account:');
    console.log('   👤 Email: admin@example.com');
    console.log('   🔑 Password: password123\n');
    console.log(`🐄 Total cows: ${cows.length}\n`);

    await dataSource.destroy();
}

seedCows().catch((error) => {
    console.error('❌ Seed error:', error);
    process.exit(1);
});
