import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UpdateUserDto, CreateUserDto, UpdateUserRoleDto } from '../../dto/user';
import * as bcrypt from 'bcrypt';

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
     * Get all users (for admin panel)
     */
    async findAll(): Promise<User[]> {
        return this.userRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Create a new user with role (admin only)
     */
    async createUser(createUserDto: CreateUserDto, currentUserRole: string): Promise<User> {
        // Only super_admin, admin, and sub_admin can create users
        if (currentUserRole !== 'super_admin' && currentUserRole !== 'admin' && currentUserRole !== 'sub_admin') {
            throw new ForbiddenException('Only admins can create users');
        }

        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email.toLowerCase() },
        });

        if (existingUser) {
            throw new ForbiddenException('Email already registered');
        }

        // Sub-admins can only create workers
        if (currentUserRole === 'sub_admin' && createUserDto.globalRole && createUserDto.globalRole !== 'worker') {
            throw new ForbiddenException('Sub-admins can only create workers');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // Create user
        const user = this.userRepository.create({
            email: createUserDto.email.toLowerCase(),
            password: hashedPassword,
            name: createUserDto.name,
            phone: createUserDto.phone || null,
            globalRole: createUserDto.globalRole || 'worker',
            isActive: true,
        });

        return this.userRepository.save(user);
    }

    /**
     * Update user role (admin only)
     */
    async updateUserRole(userId: string, updateRoleDto: UpdateUserRoleDto, currentUserRole: string): Promise<User> {
        // Only super_admin can update roles
        if (currentUserRole !== 'super_admin') {
            throw new ForbiddenException('Only super admins can update user roles');
        }

        const user = await this.findById(userId);

        // Prevent modifying super admin role
        if (user.globalRole === 'super_admin' && updateRoleDto.globalRole !== 'super_admin') {
            throw new ForbiddenException('Cannot modify super admin role');
        }

        user.globalRole = updateRoleDto.globalRole;
        if (updateRoleDto.isActive !== undefined) {
            user.isActive = updateRoleDto.isActive;
        }

        return this.userRepository.save(user);
    }

    /**
     * Delete user (super admin only)
     */
    async deleteUser(userId: string, currentUserRole: string): Promise<void> {
        // Only super_admin can delete users
        if (currentUserRole !== 'super_admin') {
            throw new ForbiddenException('Only super admins can delete users');
        }

        const user = await this.findById(userId);

        // Prevent deleting super admin
        if (user.globalRole === 'super_admin') {
            throw new ForbiddenException('Cannot delete super admin');
        }

        await this.userRepository.remove(user);
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
