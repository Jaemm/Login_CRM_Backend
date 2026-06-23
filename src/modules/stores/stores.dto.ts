import { IsNumberOrString } from '@/src/common/validators/number-or-string.validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Validate } from 'class-validator';

export class StoreGetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search: string;

  @ApiProperty({ required: false })
  @Validate(IsNumberOrString)
  @IsOptional()
  consultant_company_id: string;
}

export class StoreCreateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  postal_code: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  consultant_company_id: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  country_id: string;
}
