import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from '../../dto/user/update-user.dto';
import { CreateUserDto } from '../../dto/user/create-user.dto';
import { UpdateUserRoleDto } from '../../dto/user/update-user-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile' })
    async getProfile(@CurrentUser() user: User) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            photoUrl: user.photoUrl,
            globalRole: user.globalRole,
            isActive: user.isActive,
            languagePreference: user.languagePreference,
            createdAt: user.createdAt,
        };
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated' })
    async updateProfile(
        @CurrentUser() user: User,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        const updated = await this.usersService.update(user.id, updateUserDto);
        return {
            id: updated.id,
            email: updated.email,
            name: updated.name,
            phone: updated.phone,
            photoUrl: updated.photoUrl,
            languagePreference: updated.languagePreference,
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all users (admin only)' })
    @ApiResponse({ status: 200, description: 'List of all users' })
    async getAllUsers(@CurrentUser() user: User) {
        if (user.globalRole !== 'super_admin' && user.globalRole !== 'admin') {
            throw new Error('Only admins can view all users');
        }
        return this.usersService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Create new user (admin only)' })
    @ApiResponse({ status: 201, description: 'User created' })
    async createUser(
        @CurrentUser() user: User,
        @Body() createUserDto: CreateUserDto,
    ) {
        return this.usersService.createUser(createUserDto, user.globalRole);
    }

    @Patch(':id/role')
    @ApiOperation({ summary: 'Update user role (super admin only)' })
    @ApiResponse({ status: 200, description: 'User role updated' })
    async updateUserRole(
        @CurrentUser() user: User,
        @Param('id') id: string,
        @Body() updateRoleDto: UpdateUserRoleDto,
    ) {
        return this.usersService.updateUserRole(id, updateRoleDto, user.globalRole);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete user (super admin only)' })
    @ApiResponse({ status: 200, description: 'User deleted' })
    async deleteUser(
        @CurrentUser() user: User,
        @Param('id') id: string,
    ) {
        await this.usersService.deleteUser(id, user.globalRole);
        return { message: 'User deleted successfully' };
    }
}
