import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthBreedingService } from './health-breeding.service';
import { HealthBreedingController } from './health-breeding.controller';
import { Cow } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { FarmsModule } from '../farms/farms.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Cow, CowEvent]),
        FarmsModule,
    ],
    controllers: [HealthBreedingController],
    providers: [HealthBreedingService],
    exports: [HealthBreedingService],
})
export class HealthBreedingModule { }
