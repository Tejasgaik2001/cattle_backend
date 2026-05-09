import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ExportService } from './export.service';
import { FarmsModule } from '../farms/farms.module';
import { MilkRecordsModule } from '../milk-records/milk-records.module';
import { FinancialModule } from '../financial/financial.module';
import { MilkRecord } from '../../entities/milk-record.entity';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';
import { Cow } from '../../entities/cow.entity';
import { CowEvent } from '../../entities/cow-event.entity';
import { ReportDownload } from '../../entities/report-download.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            MilkRecord,
            FinancialTransaction,
            Cow,
            CowEvent,
            ReportDownload
        ]),
        FarmsModule,
        MilkRecordsModule,
        FinancialModule,
    ],
    controllers: [ReportsController],
    providers: [ReportsService, ExportService],
    exports: [ReportsService, ExportService],
})
export class ReportsModule { }
