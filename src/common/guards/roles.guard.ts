import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { FarmMembership, FarmRole } from '../../entities/farm-membership.entity';

/**
 * Guard that checks if the user has the required role for the farm.
 * Expects farmId to be in request params.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        @InjectRepository(FarmMembership)
        private membershipRepository: Repository<FarmMembership>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<FarmRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no roles specified, allow access
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const farmId = request.params.farmId;

        if (!user || !farmId) {
            return false;
        }

        // Check if user has membership with required role
        const membership = await this.membershipRepository.findOne({
            where: {
                userId: user.id,
                farmId: farmId,
            },
        });

        if (!membership) {
            return false;
        }

        return requiredRoles.includes(membership.role);
    }
}
