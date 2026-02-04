import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { InvitationsService } from './invitations.service';
import { Farm } from '../../entities/farm.entity';
import { FarmMembership } from '../../entities/farm-membership.entity';
import { FarmInvitation } from '../../entities/farm-invitation.entity';
import { User } from '../../entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Farm, FarmMembership, FarmInvitation, User]),
    ],
    controllers: [FarmsController],
    providers: [FarmsService, InvitationsService],
    exports: [FarmsService, InvitationsService],
})
export class FarmsModule { }
