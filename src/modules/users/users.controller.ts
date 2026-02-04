import {
    Controller,
    Get,
    Patch,
    Body,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from '../../dto/user';
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
}
