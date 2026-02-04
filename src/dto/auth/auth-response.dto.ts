import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
    @ApiProperty({ description: 'JWT access token (15 min expiry)' })
    accessToken: string;

    @ApiProperty({ description: 'JWT refresh token (7 day expiry)' })
    refreshToken: string;

    @ApiProperty({
        description: 'User profile information',
        example: {
            id: 'uuid',
            email: 'farmer@example.com',
            name: 'Rajesh Patil',
            phone: '+91 9876543210',
            photoUrl: null,
        },
    })
    user: {
        id: string;
        email: string;
        name: string;
        phone: string | null;
        photoUrl: string | null;
    };
}
