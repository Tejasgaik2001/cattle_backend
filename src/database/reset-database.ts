import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';

/**
 * Reset database script - drops all tables and recreates them
 * Run with: npm run db:reset
 */

async function resetDatabase() {
    console.log('🔄 Resetting database...\n');

    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'mycowfarm',
        entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
        synchronize: false, // We'll handle this manually
    });

    try {
        await dataSource.initialize();
        console.log('✅ Database connected\n');

        // Drop all tables
        console.log('🗑️  Dropping all tables...');
        await dataSource.query('DROP SCHEMA public CASCADE');
        await dataSource.query('CREATE SCHEMA public');
        console.log('✅ All tables dropped\n');

        // Recreate schema with synchronization
        console.log('🏗️  Recreating schema...');
        await dataSource.destroy();
        
        const syncDataSource = new DataSource({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_DATABASE || 'mycowfarm',
            entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
            synchronize: true,
        });
        
        await syncDataSource.initialize();
        await syncDataSource.synchronize();
        await syncDataSource.destroy();
        console.log('✅ Schema recreated\n');

        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ Database reset successfully!');
        console.log('═══════════════════════════════════════════════════════\n');
        console.log('🌱 Now run: npm run seed to populate with sample data');

        } catch (error) {
        console.error('❌ Reset error:', error);
        process.exit(1);
    }
}

resetDatabase();
