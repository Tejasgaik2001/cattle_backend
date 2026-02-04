import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MilkRecordsController } from './milk-records.controller';
import { MilkRecordsService } from './milk-records.service';
import { MilkRecord } from '../../entities/milk-record.entity';
import { Cow } from '../../entities/cow.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmsModule } from '../farms/farms.module';
import { CowsModule } from '../cows/cows.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([MilkRecord, Cow, FarmMembership]),
        FarmsModule,
        CowsModule,
    ],
    controllers: [MilkRecordsController],
    providers: [MilkRecordsService],
    exports: [MilkRecordsService],
})
export class MilkRecordsModule { }
