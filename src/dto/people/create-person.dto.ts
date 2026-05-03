import {
    IsString,
    IsOptional,
    IsIn,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const PERSON_ROLES = ['owner', 'family', 'worker'] as const;

export class CreatePersonDto {
    @ApiProperty({ example: 'Tejas', description: 'Name of the person' })
    @IsString()
    @MaxLength(255)
    name: string;

    @ApiProperty({
        example: 'worker',
        description: 'Role of the person',
        enum: PERSON_ROLES,
        default: 'worker',
    })
    @IsOptional()
    @IsIn(PERSON_ROLES, { message: 'Role must be owner, family, or worker' })
    role?: 'owner' | 'family' | 'worker';

    @ApiPropertyOptional({ example: 'Helps with feeding', description: 'Optional notes' })
    @IsOptional()
    @IsString()
    notes?: string;
}
