import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LicenseDto {
  @ApiProperty()
  @IsString()
  optic_number: string;
}
