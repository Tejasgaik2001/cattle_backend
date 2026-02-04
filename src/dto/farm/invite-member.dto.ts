import { IsEmail, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
    @ApiProperty({
        example: 'worker@example.com',
        description: 'Email address of the person to invite',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email: string;

    @ApiProperty({
        example: 'worker',
        description: 'Role to assign to the invited user',
        enum: ['owner', 'worker'],
    })
    @IsString()
    @IsIn(['owner', 'worker'], { message: 'Role must be owner or worker' })
    role: 'owner' | 'worker';
}
