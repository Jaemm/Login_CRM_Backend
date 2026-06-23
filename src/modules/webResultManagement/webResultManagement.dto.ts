import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class WebResultExpirationDto {
  @ApiProperty()
  @IsNumber()
  batch_id: number;

  @ApiProperty()
  @IsNumber()
  customer_id: number;
}
