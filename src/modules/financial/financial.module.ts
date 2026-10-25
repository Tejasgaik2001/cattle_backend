import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { FinancialTransaction } from '../../entities/financial-transaction.entity';
import { Cow } from '../../entities/cow.entity';
import { Person } from '../../entities/person.entity';
import { User } from '../../entities/user.entity';
import { MemberDue } from '../../entities/member-due.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmsModule } from '../farms/farms.module';
import { UsersModule } from '../users/users.module';
import { MilkRecordsModule } from '../milk-records/milk-records.module';
import { ProductionFinanceController } from './production-finance.controller';
import { ProductionFinanceService } from './production-finance.service';
import { MemberDueController } from './member-due.controller';
import { MemberDueService } from './member-due.service';
import { FinancialCategory } from '../../entities/financial-category.entity';
import { FinancialCategoryController } from './financial-category.controller';
import { FinancialCategoryService } from './financial-category.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([FinancialTransaction, Cow, FarmMembership, Person, User, MemberDue, FinancialCategory]),
        FarmsModule,
        UsersModule,
        MilkRecordsModule,
    ],
    controllers: [FinancialController, ProductionFinanceController, MemberDueController, FinancialCategoryController],
    providers: [FinancialService, ProductionFinanceService, MemberDueService, FinancialCategoryService],
    exports: [FinancialService, ProductionFinanceService, MemberDueService, FinancialCategoryService],
})
export class FinancialModule {}
