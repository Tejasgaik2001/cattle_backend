import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(
        configService: ConfigService,
        private authService: AuthService,
    ) {
        const secret = configService.get<string>('jwt.secret');
        if (!secret) {
            throw new Error('JWT_SECRET is not defined');
        }
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.authService.validateUser(payload.sub);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }
}
