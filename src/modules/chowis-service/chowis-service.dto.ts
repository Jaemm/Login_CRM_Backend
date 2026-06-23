import { IsNumberOrString } from '@/src/common/validators/number-or-string.validator';
import { ApiProperty } from '@nestjs/swagger';
import { Validate } from 'class-validator';

export class ExpirationCheckDto {
  @ApiProperty({
    example: 1,
  })
  @Validate(IsNumberOrString)
  consultant_company_id: string | number;

  @ApiProperty({
    example: 1,
  })
  @Validate(IsNumberOrString)
  service_id: string | number;
}
