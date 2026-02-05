import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
import { User } from '../../entities/user.entity';
import { Farm } from '../../entities/farm.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { Cow } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { MilkRecord } from '../../entities/milk-record.entity';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            Farm,
            FarmMembership,
            Cow,
            CowEvent,
            MilkRecord,
            FinancialTransaction,
        ]),
    ],
    controllers: [SeedController],
})
export class SeedModule { }
