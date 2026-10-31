import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cow } from '../../entities/cow.entity';
import { ExternalBull } from '../../entities/external-bull.entity';
import { Farm } from '../../entities/farm.entity';
import { User } from '../../entities/user.entity';

/**
 * Seed script to populate the pedigree family tree dataset:
 * 1. Purchased foundation animals with unknown parents (Ganga, Nandi, Kamadhenu)
 * 2. External bull record for artificial insemination (ABS SuperSire 990)
 * 3. Natural-mating calf (Bharat: sire Nandi, dam Ganga)
 * 4. AI calf with an external bull (Surabhi: external sire ABS SuperSire 990, dam Kamadhenu)
 * 5. Second-generation calf (Ananda: sire Bharat, dam Surabhi)
 *
 * Run with: npx ts-node src/database/seeds/seed-pedigree.ts
 */
async function seedPedigree() {
    console.log('🌱 Seeding Pedigree / Cattle Family Tree dataset...\n');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'mycowfarm',
        entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
        synchronize: false,
    });

    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // Find default farm
    const farms = await dataSource.getRepository(Farm).find({ take: 1 });
    if (farms.length === 0) {
        throw new Error('No farm found. Please run npm run seed first.');
    }
    const farmId = farms[0].id;
    console.log(`🏡 Using Farm: ${farms[0].name} (${farmId})`);

    const users = await dataSource.getRepository(User).find({ take: 1 });
    const userId = users.length > 0 ? users[0].id : undefined;

    const cowRepo = dataSource.getRepository(Cow);
    const extBullRepo = dataSource.getRepository(ExternalBull);

    // 1. Create External Bull for AI
    console.log('🧬 Ensuring External AI Bull exists...');
    let extBull = await extBullRepo.findOne({
        where: { farmId, registrationNo: 'HO-USA-990-AI' },
    });

    if (!extBull) {
        extBull = extBullRepo.create({
            id: uuidv4(),
            farmId,
            name: 'ABS SuperSire 990',
            registrationNo: 'HO-USA-990-AI',
            breed: 'Holstein Friesian',
            source: 'ABS Global Genetics / Semex (Straw #ST-9902)',
            notes: 'Elite genetics bull, top milk yield traits, high calving ease',
            createdBy: userId,
        });
        await extBullRepo.save(extBull);
        console.log(`✅ Created External AI Bull: ${extBull.name} (${extBull.registrationNo})`);
    } else {
        console.log(`ℹ️ External AI Bull already exists: ${extBull.name}`);
    }

    // Helper to find or create a cow
    async function upsertCow(tagId: string, data: Partial<Cow>) {
        let cow = await cowRepo.findOne({ where: { farmId, tagId } });
        if (!cow) {
            cow = cowRepo.create({
                id: uuidv4(),
                farmId,
                tagId,
                ...data,
                createdBy: userId,
            });
            await cowRepo.save(cow);
            console.log(`✅ Created cow: [${cow.tagId}] ${cow.name} (${cow.gender})`);
        } else {
            Object.assign(cow, data);
            await cowRepo.save(cow);
            console.log(`ℹ️ Updated cow: [${cow.tagId}] ${cow.name}`);
        }
        return cow;
    }

    // 2. Foundation animals (Purchased, unknown parents)
    console.log('\n📜 Creating/Updating Foundation Cattle...');
    const cowGanga = await upsertCow('COW-001', {
        name: 'Ganga',
        gender: 'female',
        breed: 'Gir',
        dateOfBirth: new Date('2019-01-15'),
        acquisitionDate: new Date('2020-02-10'),
        lifecycleStatus: 'active',
        acquisitionSource: 'Purchased from Karnal Dairy Fair',
        acquisitionCost: 55000,
        bornOnFarm: false,
        motherId: null,
        sireId: null,
        externalSireId: null,
        breedingMethod: null,
    });

    const bullNandi = await upsertCow('BULL-001', {
        name: 'Nandi',
        gender: 'male',
        breed: 'Gir',
        dateOfBirth: new Date('2018-06-10'),
        acquisitionDate: new Date('2019-10-01'),
        lifecycleStatus: 'active',
        acquisitionSource: 'Purchased Foundation Sire',
        acquisitionCost: 65000,
        bornOnFarm: false,
        motherId: null,
        sireId: null,
        externalSireId: null,
        breedingMethod: null,
    });

    const cowKamadhenu = await upsertCow('COW-002', {
        name: 'Kamadhenu',
        gender: 'female',
        breed: 'Holstein Friesian',
        dateOfBirth: new Date('2019-05-20'),
        acquisitionDate: new Date('2020-07-15'),
        lifecycleStatus: 'active',
        acquisitionSource: 'Purchased from Punjab Dairy Herd',
        acquisitionCost: 62000,
        bornOnFarm: false,
        motherId: null,
        sireId: null,
        externalSireId: null,
        breedingMethod: null,
    });

    // 3. Natural-mating calf (Bharat: mother Ganga, sire Nandi)
    console.log('\n🐂 Creating Natural-Mating Calf...');
    const calfBharat = await upsertCow('CALF-001', {
        name: 'Bharat',
        gender: 'male',
        breed: 'Gir',
        dateOfBirth: new Date('2021-03-10'),
        acquisitionDate: new Date('2021-03-10'),
        lifecycleStatus: 'active',
        acquisitionSource: 'Born on farm',
        bornOnFarm: true,
        motherId: cowGanga.id,
        sireId: bullNandi.id,
        externalSireId: null,
        breedingMethod: 'NATURAL',
    });

    // 4. AI calf with External Bull (Surabhi: mother Kamadhenu, external sire ABS SuperSire 990)
    console.log('\n💉 Creating AI Calf with External Sire...');
    const calfSurabhi = await upsertCow('CALF-002', {
        name: 'Surabhi',
        gender: 'female',
        breed: 'Holstein Friesian',
        dateOfBirth: new Date('2021-08-14'),
        acquisitionDate: new Date('2021-08-14'),
        lifecycleStatus: 'active',
        acquisitionSource: 'Born on farm (AI)',
        bornOnFarm: true,
        motherId: cowKamadhenu.id,
        sireId: null,
        externalSireId: extBull.id,
        breedingMethod: 'AI',
    });

    // 5. Second-generation calf (Ananda: mother Surabhi, sire Bharat)
    console.log('\n🐄 Creating Second-Generation Calf...');
    const calfAnanda = await upsertCow('CALF-003', {
        name: 'Ananda',
        gender: 'female',
        breed: 'Gir x Holstein Cross',
        dateOfBirth: new Date('2023-11-05'),
        acquisitionDate: new Date('2023-11-05'),
        lifecycleStatus: 'active',
        acquisitionSource: 'Born on farm',
        bornOnFarm: true,
        motherId: calfSurabhi.id,
        sireId: calfBharat.id,
        externalSireId: null,
        breedingMethod: 'NATURAL',
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 Pedigree family tree dataset seeded successfully!');
    console.log('   - Foundation: [COW-001] Ganga, [BULL-001] Nandi, [COW-002] Kamadhenu');
    console.log('   - AI Bull:    ABS SuperSire 990 (HO-USA-990-AI)');
    console.log('   - Natural:    [CALF-001] Bharat (Sire: Nandi, Dam: Ganga)');
    console.log('   - AI Calf:    [CALF-002] Surabhi (Ext Sire: ABS SuperSire 990, Dam: Kamadhenu)');
    console.log('   - 2nd Gen:    [CALF-003] Ananda (Sire: Bharat, Dam: Surabhi)');
    console.log('═══════════════════════════════════════════════════════\n');

    await dataSource.destroy();
}

seedPedigree().catch((error) => {
    console.error('❌ Pedigree seed error:', error);
    process.exit(1);
});
