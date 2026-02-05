import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';
import { Cow } from '../../entities/cow.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmsModule } from '../farms/farms.module';
import { MilkRecordsModule } from '../milk-records/milk-records.module';
import { ProductionFinanceController } from './production-finance.controller';
import { ProductionFinanceService } from './production-finance.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([FinancialTransaction, Cow, FarmMembership]),
        FarmsModule,
        MilkRecordsModule,
    ],
    controllers: [FinancialController, ProductionFinanceController],
    providers: [FinancialService, ProductionFinanceService],
    exports: [FinancialService, ProductionFinanceService],
})
export class FinancialModule { }
