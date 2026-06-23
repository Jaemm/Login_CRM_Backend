import { IsNumberOrString } from '@/src/common/validators/number-or-string.validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Validate } from 'class-validator';

export class ProductsFetchDto {
  @ApiProperty()
  @IsString()
  optic_number: string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class ProductsEnterDto {
  @ApiProperty()
  @IsOptional()
  optic_number: string;

  @ApiProperty()
  @IsOptional()
  password: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  @IsOptional()
  application_id: string;

  @ApiProperty()
  @IsOptional()
  mac_address: string;

  @ApiProperty()
  @IsOptional()
  first_use_date: string;

  @ApiProperty()
  @IsOptional()
  lat: string;

  @ApiProperty()
  @IsOptional()
  lng: string;
}
