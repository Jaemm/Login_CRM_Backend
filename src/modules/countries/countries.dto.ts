import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CountriesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search: string;
}
