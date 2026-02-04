import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFarmDto {
    @ApiPropertyOptional({
        example: 'Green Valley Dairy Farm',
        description: 'Name of the farm',
        minLength: 2,
    })
    @IsOptional()
    @IsString()
    @MinLength(2, { message: 'Farm name must be at least 2 characters long' })
    name?: string;

    @ApiPropertyOptional({
        example: 'Pune, Maharashtra',
        description: 'Farm location/address',
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({
        example: 'A medium-sized dairy farm with quality Holstein and Gir cows',
        description: 'Brief description of the farm',
    })
    @IsOptional()
    @IsString()
    description?: string;
}
