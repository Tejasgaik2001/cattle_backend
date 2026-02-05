import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { FarmsModule } from '../farms/farms.module';
import { CowsModule } from '../cows/cows.module';
import { MilkRecordsModule } from '../milk-records/milk-records.module';
import { CowEventsModule } from '../cow-events/cow-events.module';

@Module({
    imports: [
        FarmsModule,
        CowsModule,
        MilkRecordsModule,
        CowEventsModule,
    ],
    controllers: [DashboardController],
})
export class DashboardModule { }
