import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberDue, MemberDueType, MemberDueStatus, FinancialTransaction, Person } from '../../entities';

export interface CreateMemberDueDto {
    personId: string;
    amount: number;
    type: MemberDueType;
    transactionId?: string;
    note?: string;
}

export class SettleMemberDueDto {
    paidDate: string;
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
    ) {}

    async create(dto: CreateMemberDueDto): Promise<MemberDue> {
        const due = this.memberDueRepository.create({
            personId: dto.personId,
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
                person: { farmId }
            },
            relations: ['person', 'linkedTransaction'],
            order: { createdAt: 'DESC' },
        });
    }

    async getPendingSummaryByPerson(farmId: string): Promise<any[]> {
        const pendingDues = await this.findAllPending(farmId);
        
        const personGroups = new Map<string, any>();

        pendingDues.forEach(due => {
            const pid = due.personId;
            if (!personGroups.has(pid)) {
                personGroups.set(pid, {
                    personId: pid,
                    name: due.person.name,
                    role: due.person.role,
                    businessOwes: 0,
                    owesBusiness: 0,
                    items: []
                });
            }

            const group = personGroups.get(pid);
            if (due.type === MemberDueType.BUSINESS_OWES) {
                group.businessOwes += Number(due.amount);
            } else {
                group.owesBusiness += Number(due.amount);
            }
            group.items.push(due);
        });

        return Array.from(personGroups.values());
    }

    async getTotalPendingSummary(farmId: string): Promise<{ businessOwesTotal: number, owesBusinessTotal: number }> {
        const dues = await this.memberDueRepository.find({
            where: { 
                status: MemberDueStatus.PENDING,
                person: { farmId }
            },
            relations: ['person']
        });

        return dues.reduce((acc, due) => {
            if (due.type === MemberDueType.BUSINESS_OWES) {
                acc.businessOwesTotal += Number(due.amount);
            } else {
                acc.owesBusinessTotal += Number(due.amount);
            }
            return acc;
        }, { businessOwesTotal: 0, owesBusinessTotal: 0 });
    }

    async settle(id: string, dto: SettleMemberDueDto): Promise<MemberDue> {
        const due = await this.memberDueRepository.findOne({
            where: { id },
            relations: ['person']
        });

        if (!due) {
            throw new NotFoundException('Member due entry not found');
        }

        if (due.status === MemberDueStatus.SETTLED) {
            return due;
        }

        // Create a settlement transaction to reflect in farm cash flow
        const settlementTx = this.transactionRepository.create({
            farmId: due.person.farmId,
            amount: due.amount,
            date: new Date(dto.paidDate),
            // If Business owes Member, and we pay -> it's an EXPENSE for business cash
            // If Member owes Business, and they pay -> it's an INCOME for business cash
            type: due.type === MemberDueType.BUSINESS_OWES ? 'expense' : 'income',
            category: due.type === MemberDueType.BUSINESS_OWES ? 'Reimbursement Payment' : 'Member Due Settlement',
            description: `Settlement for ${due.type === MemberDueType.BUSINESS_OWES ? 'reimbursement' : 'member collection'}. ${dto.note || ''}`,
            paidById: due.personId,
        });

        await this.transactionRepository.save(settlementTx);

        due.status = MemberDueStatus.SETTLED;
        due.settledAt = new Date();
        due.note = (due.note ? due.note + ' | ' : '') + `Settled on ${dto.paidDate}. ${dto.note || ''}`;

        return await this.memberDueRepository.save(due);
    }
}
