import { IsEmail, IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import type { GlobalRole } from '../../entities/user.entity';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEnum(['super_admin', 'admin', 'sub_admin', 'worker'])
    @IsOptional()
    globalRole?: GlobalRole;
}
