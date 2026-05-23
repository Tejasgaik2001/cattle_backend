import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { MemberDue, MemberDueType, MemberDueStatus, FinancialTransaction, Person, User } from '../../entities';

export interface CreateMemberDueDto {
    personId?: string;
    userId?: string;
    amount: number;
    type: MemberDueType;
    transactionId?: string;
    note?: string;
}

export class SettleMemberDueDto {
    @IsDateString()
    paidDate: string;

    @IsOptional()
    @IsNumber()
    amount?: number; // If not provided, pays full amount

    @IsOptional()
    @IsString()
    note?: string;
}

@Injectable()
export class MemberDueService {
    constructor(
        @InjectRepository(MemberDue)
        private readonly memberDueRepository: Repository<MemberDue>,
        @InjectRepository(FinancialTransaction)
        private readonly transactionRepository: Repository<FinancialTransaction>,
        @InjectRepository(Person)
        private readonly personRepository: Repository<Person>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async create(dto: CreateMemberDueDto): Promise<MemberDue> {
        const due = this.memberDueRepository.create({
            personId: dto.personId || null,
            userId: dto.userId || null,
            amount: dto.amount,
            type: dto.type,
            linkedTransactionId: dto.transactionId,
            note: dto.note,
            status: MemberDueStatus.PENDING,
        });
        return await this.memberDueRepository.save(due);
    }

    async findAllPending(farmId: string): Promise<MemberDue[]> {
        return await this.memberDueRepository.find({
            where: { 
                status: MemberDueStatus.PENDING,
            },
            relations: ['person', 'user', 'linkedTransaction'],
            order: { createdAt: 'DESC' },
        });
    }

    async getPendingSummaryByPerson(farmId: string): Promise<any[]> {
        const dues = await this.memberDueRepository.find({
            where: { 
                status: MemberDueStatus.PENDING,
            },
            relations: ['person', 'user', 'linkedTransaction'],
            order: { createdAt: 'DESC' },
        });

        // Also include partially paid dues
        const partiallyPaidDues = await this.memberDueRepository.find({
            where: { 
                status: MemberDueStatus.PARTIALLY_PAID,
            },
            relations: ['person', 'user', 'linkedTransaction'],
            order: { createdAt: 'DESC' },
        });

        const allDues = [...dues, ...partiallyPaidDues];
        
        const groups = new Map<string, any>();

        allDues.forEach(due => {
            const id = due.personId || due.userId;
            const name = due.person?.name || due.user?.name;
            const role = due.person?.role || due.user?.globalRole;
            
            if (!id) return;
            
            if (!groups.has(id)) {
                groups.set(id, {
                    personId: due.personId,
                    userId: due.userId,
                    name: name,
                    role: role,
                    businessOwes: 0,
                    owesBusiness: 0,
                    items: []
                });
            }

            const group = groups.get(id);
            const remainingAmount = Number(due.amount) - Number(due.paidAmount || 0);
            
            if (due.type === MemberDueType.BUSINESS_OWES) {
                group.businessOwes += remainingAmount;
            } else {
                group.owesBusiness += remainingAmount;
            }
            group.items.push(due);
        });

        return Array.from(groups.values());
    }

    async getTotalPendingSummary(farmId: string): Promise<{ businessOwesTotal: number, owesBusinessTotal: number }> {
        const dues = await this.memberDueRepository.find({
            where: { 
                status: MemberDueStatus.PENDING,
            },
            relations: ['person', 'user']
        });

        const partiallyPaidDues = await this.memberDueRepository.find({
            where: { 
                status: MemberDueStatus.PARTIALLY_PAID,
            },
            relations: ['person', 'user']
        });

        const allDues = [...dues, ...partiallyPaidDues];

        return allDues.reduce((acc, due) => {
            const remainingAmount = Number(due.amount) - Number(due.paidAmount || 0);
            if (due.type === MemberDueType.BUSINESS_OWES) {
                acc.businessOwesTotal += remainingAmount;
            } else {
                acc.owesBusinessTotal += remainingAmount;
            }
            return acc;
        }, { businessOwesTotal: 0, owesBusinessTotal: 0 });
    }

    async settle(id: string, dto: SettleMemberDueDto, farmId?: string): Promise<MemberDue> {
        const due = await this.memberDueRepository.findOne({
            where: { id },
            relations: ['person', 'user']
        });

        if (!due) {
            throw new NotFoundException('Member due entry not found');
        }

        if (due.status === MemberDueStatus.SETTLED) {
            return due;
        }

        // Calculate payment amount
        const remainingAmount = Number(due.amount) - Number(due.paidAmount || 0);
        const paymentAmount = dto.amount ? Math.min(Number(dto.amount), remainingAmount) : remainingAmount;

        if (paymentAmount <= 0) {
            throw new NotFoundException('No remaining amount to pay');
        }

        // Get farmId from parameter, person, or user
        if (!farmId) {
            farmId = due.person?.farmId;
        }
        
        if (!farmId) {
            throw new NotFoundException('Cannot determine farm for settlement');
        }

        // Create a settlement transaction to reflect in farm cash flow
        const settlementTx = this.transactionRepository.create({
            farmId: farmId,
            amount: paymentAmount,
            date: new Date(dto.paidDate),
            // If Business owes Member, and we pay -> it's an EXPENSE for business cash
            // If Member owes Business, and they pay -> it's an INCOME for business cash
            type: due.type === MemberDueType.BUSINESS_OWES ? 'expense' : 'income',
            category: due.type === MemberDueType.BUSINESS_OWES ? 'Reimbursement Payment' : 'Member Due Settlement',
            description: `Partial payment (${paymentAmount}) for ${due.type === MemberDueType.BUSINESS_OWES ? 'reimbursement' : 'member collection'}. ${dto.note || ''}`,
            paidById: due.personId || due.userId,
        });

        await this.transactionRepository.save(settlementTx);

        // Update paid amount and status
        due.paidAmount = Number(due.paidAmount || 0) + paymentAmount;
        
        if (due.paidAmount >= Number(due.amount)) {
            due.status = MemberDueStatus.SETTLED;
            due.settledAt = new Date();
        } else {
            due.status = MemberDueStatus.PARTIALLY_PAID;
        }
        
        due.note = (due.note ? due.note + ' | ' : '') + `Payment of ${paymentAmount} on ${dto.paidDate}. ${dto.note || ''}`;

        return await this.memberDueRepository.save(due);
    }
}
