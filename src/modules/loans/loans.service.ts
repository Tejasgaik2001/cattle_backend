import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../../entities/loan.entity';
import { LoanPayment } from '../../entities/loan-payment.entity';
import { CreateLoanDto } from '../../dto/loans/create-loan.dto';
import { CreateLoanPaymentDto } from '../../dto/loans/create-loan-payment.dto';

@Injectable()
export class LoansService {
    constructor(
        @InjectRepository(Loan)
        private loanRepository: Repository<Loan>,
        @InjectRepository(LoanPayment)
        private paymentRepository: Repository<LoanPayment>,
    ) {}

    /**
     * Create a new loan
     */
    async createLoan(farmId: string, dto: CreateLoanDto, userId: string): Promise<Loan> {
        const loan = this.loanRepository.create({
            ...dto,
            farmId,
            principalAmount: dto.principalAmount,
            interestRate: dto.interestRate,
            startDate: new Date(dto.startDate),
            type: dto.type ?? 'simple',
            status: 'active',
            createdBy: userId,
        });
        return this.loanRepository.save(loan);
    }

    /**
     * Get all loans for a farm with computed outstanding balance
     */
    async findAll(farmId: string): Promise<Array<Loan & { outstandingBalance: number; totalPaid: number; accruedInterest: number }>> {
        const loans = await this.loanRepository.find({
            where: { farmId },
            relations: ['payments'],
            order: { status: 'ASC', startDate: 'DESC' },
        });

        return loans.map((loan) => this.computeLoanMetrics(loan));
    }

    /**
     * Get a single loan with full detail
     */
    async findOne(farmId: string, loanId: string): Promise<Loan & { outstandingBalance: number; totalPaid: number; accruedInterest: number }> {
        const loan = await this.loanRepository.findOne({
            where: { id: loanId, farmId },
            relations: ['payments'],
        });
        if (!loan) throw new NotFoundException('Loan not found');
        return this.computeLoanMetrics(loan);
    }

    /**
     * Add a payment to a loan
     */
    async addPayment(
        farmId: string,
        loanId: string,
        dto: CreateLoanPaymentDto,
        userId: string,
    ): Promise<LoanPayment> {
        const loan = await this.findOne(farmId, loanId);
        if (loan.status === 'closed') {
            throw new BadRequestException('Cannot add payment to a closed loan');
        }

        // If interest/principal components not provided, auto-split based on rate
        let interestComponent = dto.interestComponent ?? 0;
        let principalComponent = dto.principalComponent ?? 0;

        if (!dto.interestComponent && !dto.principalComponent) {
            // Simple proportional split based on outstanding
            interestComponent = dto.amountPaid * (loan.interestRate / 100 / 12);
            principalComponent = Math.max(0, dto.amountPaid - interestComponent);
        }

        const payment = this.paymentRepository.create({
            loanId,
            paymentDate: new Date(dto.paymentDate),
            amountPaid: dto.amountPaid,
            interestComponent,
            principalComponent,
            notes: dto.notes,
            createdBy: userId,
        });

        const saved = await this.paymentRepository.save(payment);

        // Auto-close loan if fully paid off
        const updatedLoan = await this.findOne(farmId, loanId);
        if (updatedLoan.outstandingBalance <= 0) {
            await this.loanRepository.update(loanId, { status: 'closed' });
        }

        return saved;
    }

    /**
     * Update loan status
     */
    async updateStatus(farmId: string, loanId: string, status: 'active' | 'closed'): Promise<Loan> {
        const loan = await this.loanRepository.findOne({ where: { id: loanId, farmId } });
        if (!loan) throw new NotFoundException('Loan not found');
        loan.status = status;
        return this.loanRepository.save(loan);
    }

    /**
     * Get total outstanding loan balance for the farm
     */
    async getTotalOutstanding(farmId: string): Promise<number> {
        const loans = await this.findAll(farmId);
        return loans
            .filter((l) => l.status === 'active')
            .reduce((sum, l) => sum + Math.max(0, l.outstandingBalance), 0);
    }

    /**
     * Compute outstanding balance and accrued interest for a loan
     */
    private computeLoanMetrics(loan: Loan) {
        const payments = loan.payments ?? [];
        const totalPrincipalPaid = payments.reduce(
            (sum, p) => sum + Number(p.principalComponent),
            0,
        );
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const outstandingBalance = Number(loan.principalAmount) - totalPrincipalPaid;

        // Simple interest accrued from start date to today
        const daysElapsed = Math.floor(
            (Date.now() - new Date(loan.startDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        const yearsElapsed = daysElapsed / 365;
        const accruedInterest =
            loan.type === 'simple'
                ? (Number(loan.principalAmount) * Number(loan.interestRate) * yearsElapsed) / 100
                : Number(loan.principalAmount) *
                  (Math.pow(1 + Number(loan.interestRate) / 100, yearsElapsed) - 1);

        return {
            ...loan,
            outstandingBalance: Math.max(0, outstandingBalance),
            totalPaid,
            accruedInterest: Math.round(accruedInterest * 100) / 100,
        };
    }
}
