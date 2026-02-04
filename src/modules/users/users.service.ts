import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UpdateUserDto } from '../../dto/user';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
    }

    /**
     * Update user profile
     */
    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);

        Object.assign(user, updateUserDto);

        return this.userRepository.save(user);
    }

    /**
     * Update user photo URL
     */
    async updatePhoto(id: string, photoUrl: string): Promise<User> {
        const user = await this.findById(id);
        user.photoUrl = photoUrl;
        return this.userRepository.save(user);
    }
}
