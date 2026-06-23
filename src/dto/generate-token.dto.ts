import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateTokenDto {
  @ApiProperty({ example: 'W3TZ6SRfFh' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ example: 'dermochoice' })
  @IsString()
  @IsNotEmpty()
  serviceName: string;
}
