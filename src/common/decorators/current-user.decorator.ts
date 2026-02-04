import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../entities/user.entity';

/**
 * Custom decorator to extract the current user from the request.
 * Use after JwtAuthGuard to access the authenticated user.
 */
export const CurrentUser = createParamDecorator(
    (data: keyof User | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return null;
        }

        return data ? user[data] : user;
    },
);
