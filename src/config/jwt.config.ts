import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
    secret: process.env.JWT_SECRET || 'mycowfarm-secret-key',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
