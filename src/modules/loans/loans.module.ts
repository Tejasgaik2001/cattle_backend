import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { Loan } from '../../entities/loan.entity';
import { LoanPayment } from '../../entities/loan-payment.entity';
import { FarmsModule } from '../farms/farms.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Loan, LoanPayment]),
        FarmsModule,
    ],
    controllers: [LoansController],
    providers: [LoansService],
    exports: [LoansService],
})
export class LoansModule {}
