import { SetMetadata } from '@nestjs/common';
import { FarmRole } from '../../entities/farm-membership.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route.
 * Use with RolesGuard to enforce role-based access.
 * 
 * @example
 * @Roles('owner')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * deleteResource() { ... }
 */
export const Roles = (...roles: FarmRole[]) => SetMetadata(ROLES_KEY, roles);
