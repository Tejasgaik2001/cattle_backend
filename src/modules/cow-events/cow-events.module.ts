import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CowEventsController } from './cow-events.controller';
import { HealthBreedingController } from './health-breeding.controller';
import { CowEventsService } from './cow-events.service';
import { CowEvent } from '../../entities/cow-event.entity';
import { Cow } from '../../entities/cow.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmsModule } from '../farms/farms.module';
import { CowsModule } from '../cows/cows.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CowEvent, Cow, FarmMembership]),
        FarmsModule,
        CowsModule,
    ],
    controllers: [CowEventsController, HealthBreedingController],
    providers: [CowEventsService],
    exports: [CowEventsService],
})
export class CowEventsModule { }
