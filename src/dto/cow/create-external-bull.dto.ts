import {
    IsString,
    IsOptional,
    MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExternalBullDto {
    @ApiProperty({
        example: 'ABS SuperSire 777',
        description: 'Name of the external/semen bull',
    })
    @IsString()
    @MinLength(1, { message: 'Bull name is required' })
    name: string;

    @ApiProperty({
        example: 'HO-USA-12345678',
        description: 'Registration / Straw / Semen code',
    })
    @IsString()
    @MinLength(1, { message: 'Registration number is required' })
    registrationNo: string;

    @ApiPropertyOptional({
        example: 'Holstein',
        description: 'Breed of the bull',
    })
    @IsOptional()
    @IsString()
    breed?: string;

    @ApiPropertyOptional({
        example: 'ABS Global / Semex Straws',
        description: 'Source or semen company',
    })
    @IsOptional()
    @IsString()
    source?: string;

    @ApiPropertyOptional({
        example: 'High milk yield genetics, daughter pregnancy rate +2.1',
        description: 'Optional notes on the bull',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
