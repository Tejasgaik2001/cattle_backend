import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Get,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponseDto } from '../../dto/auth';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators';
import { User } from '../../entities/user.entity';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully', type: AuthResponseDto })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    @UseGuards(JwtRefreshGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiBody({ type: RefreshTokenDto })
    @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    async refresh(
        @CurrentUser() user: User,
        @Body() refreshTokenDto: RefreshTokenDto,
    ): Promise<{ accessToken: string; refreshToken: string }> {
        return this.authService.refreshTokens(user.id, refreshTokenDto.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout and invalidate refresh token' })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logout(@CurrentUser() user: User): Promise<{ message: string }> {
        await this.authService.logout(user.id);
        return { message: 'Logged out successfully' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async me(@CurrentUser() user: User) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            photoUrl: user.photoUrl,
            languagePreference: user.languagePreference,
        };
    }
}
