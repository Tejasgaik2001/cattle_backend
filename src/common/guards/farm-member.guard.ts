import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FarmMembership } from '../../entities/farm-membership.entity';

/**
 * Guard that checks if the user is a member of the farm.
 * Expects farmId to be in request params.
 */
@Injectable()
export class FarmMemberGuard implements CanActivate {
    constructor(
        @InjectRepository(FarmMembership)
        private membershipRepository: Repository<FarmMembership>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const farmId = request.params.farmId;

        if (!user) {
            return false;
        }

        if (!farmId) {
            // If no farmId in params, skip this check
            return true;
        }

        const membership = await this.membershipRepository.findOne({
            where: {
                userId: user.id,
                farmId: farmId,
            },
        });

        if (!membership) {
            throw new ForbiddenException('You are not a member of this farm');
        }

        // Attach membership to request for later use
        request.farmMembership = membership;

        return true;
    }
}
