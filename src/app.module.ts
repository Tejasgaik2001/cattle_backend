import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Config
import { databaseConfig, jwtConfig, storageConfig } from './config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FarmsModule } from './modules/farms/farms.module';
import { CowsModule } from './modules/cows/cows.module';
import { CowEventsModule } from './modules/cow-events/cow-events.module';
import { MilkRecordsModule } from './modules/milk-records/milk-records.module';
import { FinancialModule } from './modules/financial/financial.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SeedModule } from './modules/seed/seed.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthBreedingModule } from './modules/health-breeding/health-breeding.module';

// Controllers (for invitations public route)
import { InvitationsController } from './modules/farms/farms.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, storageConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Feature Modules
    AuthModule,
    UsersModule,
    FarmsModule,
    CowsModule,
    CowEventsModule,
    MilkRecordsModule,
    FinancialModule,
    DashboardModule,
    SeedModule,
    ReportsModule,
    HealthBreedingModule,
  ],
  controllers: [InvitationsController],
})
export class AppModule { }
