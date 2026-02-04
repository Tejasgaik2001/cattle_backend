import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { User } from '../../entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const secret = configService.get<string>('jwt.secret') || 'default-secret';
                // 15 minutes in seconds
                const accessExpirationSeconds = 15 * 60;
                return {
                    secret,
                    signOptions: {
                        expiresIn: accessExpirationSeconds,
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
    exports: [AuthService, JwtModule],
})
export class AuthModule { }
