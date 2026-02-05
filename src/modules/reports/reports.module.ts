import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { FarmsModule } from '../farms/farms.module';
import { MilkRecordsModule } from '../milk-records/milk-records.module';
import { FinancialModule } from '../financial/financial.module';

@Module({
    imports: [
        FarmsModule,
        MilkRecordsModule,
        FinancialModule,
    ],
    controllers: [ReportsController],
})
export class ReportsModule { }
