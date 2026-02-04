import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from '../../dto/auth';

export interface JwtPayload {
    sub: string;
    email: string;
}

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    /**
     * Register a new user
     */
    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { email, password, name, phone } = registerDto;

        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = this.userRepository.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            phone: phone || null,
        });

        await this.userRepository.save(user);

        // Generate tokens
        const tokens = await this.generateTokens(user);

        // Save refresh token
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                photoUrl: user.photoUrl,
            },
        };
    }

    /**
     * Login with email and password
     */
    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { email, password } = loginDto;

        const user = await this.userRepository.findOne({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // Generate tokens
        const tokens = await this.generateTokens(user);

        // Save refresh token
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                photoUrl: user.photoUrl,
            },
        };
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshTokens(userId: string, refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Access denied');
        }

        const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

        if (!isRefreshTokenValid) {
            throw new UnauthorizedException('Access denied');
        }

        // Generate new tokens
        const tokens = await this.generateTokens(user);

        // Save new refresh token
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    /**
     * Logout - invalidate refresh token
     */
    async logout(userId: string): Promise<void> {
        await this.userRepository.update(userId, { refreshToken: null });
    }

    /**
     * Validate user by ID (for JWT strategy)
     */
    async validateUser(userId: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }

    /**
     * Generate access and refresh tokens
     */
    private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
        };

        // Default 7 days in seconds
        const refreshExpirationSeconds = 7 * 24 * 60 * 60;

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload),
            this.jwtService.signAsync(payload, {
                expiresIn: refreshExpirationSeconds,
            }),
        ]);

        return { accessToken, refreshToken };
    }

    /**
     * Hash and save refresh token
     */
    private async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.userRepository.update(userId, { refreshToken: hashedRefreshToken });
    }
}
