import { IsEnum, IsOptional } from 'class-validator';
import type { GlobalRole } from '../../entities/user.entity';

export class UpdateUserRoleDto {
    @IsEnum(['super_admin', 'admin', 'sub_admin', 'worker'])
    globalRole: GlobalRole;

    @IsOptional()
    isActive?: boolean;
}
