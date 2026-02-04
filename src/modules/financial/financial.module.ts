import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';
import { Cow } from '../../entities/cow.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmsModule } from '../farms/farms.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([FinancialTransaction, Cow, FarmMembership]),
        FarmsModule,
    ],
    controllers: [FinancialController],
    providers: [FinancialService],
    exports: [FinancialService],
})
export class FinancialModule { }
