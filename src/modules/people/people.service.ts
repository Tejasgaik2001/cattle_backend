import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from '../../entities/person.entity';
import { CreatePersonDto } from '../../dto/people/create-person.dto';

@Injectable()
export class PeopleService {
    constructor(
        @InjectRepository(Person)
        private personRepository: Repository<Person>,
    ) {}

    /**
     * Create a new person for the farm
     */
    async create(farmId: string, dto: CreatePersonDto, userId: string): Promise<Person> {
        const person = this.personRepository.create({
            ...dto,
            role: dto.role ?? 'worker',
            farmId,
            createdBy: userId,
        });
        return this.personRepository.save(person);
    }

    /**
     * Get all people for a farm
     */
    async findAll(farmId: string): Promise<Person[]> {
        return this.personRepository.find({
            where: { farmId },
            order: { role: 'ASC', name: 'ASC' },
        });
    }

    /**
     * Get a single person
     */
    async findOne(farmId: string, personId: string): Promise<Person> {
        const person = await this.personRepository.findOne({
            where: { id: personId, farmId },
        });
        if (!person) {
            throw new NotFoundException('Person not found');
        }
        return person;
    }

    /**
     * Update a person
     */
    async update(
        farmId: string,
        personId: string,
        dto: Partial<CreatePersonDto>,
        userId: string,
    ): Promise<Person> {
        const person = await this.findOne(farmId, personId);
        Object.assign(person, dto);
        return this.personRepository.save(person);
    }

    /**
     * Delete a person
     */
    async remove(farmId: string, personId: string): Promise<void> {
        const person = await this.findOne(farmId, personId);
        await this.personRepository.remove(person);
    }

    /**
     * Ensure an "Owner" person exists for the farm. Creates one if not.
     * Called lazily on first use of the financials feature.
     */
    async ensureOwnerExists(farmId: string, ownerName: string, userId: string): Promise<Person> {
        const existing = await this.personRepository.findOne({
            where: { farmId, role: 'owner' },
        });
        if (existing) return existing;

        return this.create(farmId, { name: ownerName, role: 'owner' }, userId);
    }
}
