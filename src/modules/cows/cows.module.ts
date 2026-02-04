import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CowsController } from './cows.controller';
import { CowsService } from './cows.service';
import { Cow } from '../../entities/cow.entity';
import { Farm } from '../../entities/farm.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmsModule } from '../farms/farms.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Cow, Farm, FarmMembership]),
        FarmsModule,
    ],
    controllers: [CowsController],
    providers: [CowsService],
    exports: [CowsService],
})
export class CowsModule { }
