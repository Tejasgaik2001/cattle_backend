import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AlertsService } from './alerts.service';
import { Cow } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { MilkRecord } from '../../entities/milk-record.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmsModule } from '../farms/farms.module';
import { CowsModule } from '../cows/cows.module';
import { CowEventsModule } from '../cow-events/cow-events.module';
import { MilkRecordsModule } from '../milk-records/milk-records.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Cow, CowEvent, MilkRecord, FarmMembership]),
        FarmsModule,
        CowsModule,
        CowEventsModule,
        MilkRecordsModule,
    ],
    controllers: [DashboardController],
    providers: [DashboardService, AlertsService],
    exports: [DashboardService, AlertsService],
})
export class DashboardModule { }
