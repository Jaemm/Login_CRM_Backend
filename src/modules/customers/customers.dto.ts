import { IsNumberOrString } from '@/src/common/validators/number-or-string.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, Matches, Validate, IsNotEmpty } from 'class-validator';

export class CustomersDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  app_id: number | string;

  @ApiProperty()
  @IsString()
  password: string;
}

export class CustomerSignUpDto {
  @IsOptional()
  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  @IsOptional()
  app_id: number;

  @IsOptional()
  @ApiProperty()
  @IsString()
  phone: string;

  @IsOptional()
  @ApiProperty()
  @IsString()
  @Matches(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{7,20}$/, {
    message: 'Password must contain at least 7 characters, including Upper/lowercase and numbers',
  })
  password: string;
}

export class ChangePasswordCustomerDto {
  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty()
  @IsString()
  new_password: string;
}

export class UpdateCustomersDto {
  @ApiProperty()
  @IsOptional()
  email: string;

  @ApiProperty()
  @IsOptional()
  phone: string;

  @ApiProperty()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsOptional()
  surname: string;

  @ApiProperty()
  @IsOptional()
  os: string;

  @ApiProperty()
  @IsOptional()
  language: string;

  @ApiProperty()
  @IsOptional()
  birth: string;

  @ApiProperty()
  @IsOptional()
  address: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  @IsOptional()
  app_id: number;

  @ApiProperty()
  @IsOptional()
  age: number;

  @ApiProperty()
  @Validate(IsNumberOrString)
  skin_color_group_id: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  ethnicity_id: string;

  @ApiProperty()
  @IsOptional()
  city: string;

  @ApiProperty()
  @IsOptional()
  state: string;

  @ApiProperty()
  @IsOptional()
  zip_code: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  @IsOptional()
  phone_country_code: string;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) => value.toUpperCase())
  @IsString()
  country_code: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country: string;

  @ApiProperty()
  @IsOptional()
  @Validate(IsNumberOrString)
  gender_id: string;

  @ApiProperty()
  @IsOptional()
  @Validate(IsNumberOrString)
  consultant_shop_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Validate(IsNumberOrString)
  country_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country_name: string;
}

export class PasswordDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  app_id: string;
}

export class AllLicenseDto {
  @ApiProperty()
  @IsString()
  optic_number: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  application_id: string;
}

export class CustomerChangeLicenseDto {
  @ApiProperty()
  @IsString()
  optic_number: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  app_id: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  license_id: string;
}

export class CalculatePriceDto {
  @ApiProperty({
    description: 'Optic number comma seprated like 1,2,3',
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  optic_number: string;

  @ApiPropertyOptional({
    enum: ['days', 'months', 'years'],
    description: 'time Type(it can be days, months, years and only needed for extend)',
  })
  @IsOptional()
  @IsString()
  time_type: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  duration: string;

  @ApiProperty({
    enum: ['change', 'extend'],
    description: 'it can be change or extend',
    default: 'change',
  })
  @IsString()
  selection_type: string;

  @ApiPropertyOptional()
  @Validate(IsNumberOrString)
  @IsOptional()
  license_id: string;
}

export class UpdateLicenseDto {
  @ApiProperty()
  @IsString()
  optic_number: string;

  @ApiProperty()
  @IsString()
  duration: string;

  @ApiProperty({
    enum: ['days', 'months', 'years'],
    description: 'time Type(it can be days, months, years and only needed for extend)',
    default: 'days',
  })
  @IsString()
  time_type: string;
}

export class RenewDevicesDto {
  @ApiProperty({
    description: 'Optic number comma seprated like 1,2,3',
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  optic_numbers: string;

  @ApiProperty({
    enum: ['days', 'months', 'years'],
    description: 'time Type(it can be days, months, years and only needed for extend)',
    default: 'days',
  })
  @IsString()
  time_type: string;

  @ApiProperty()
  @IsString()
  duration: string;

  @ApiProperty({
    enum: ['true', 'false'],
  })
  @IsString()
  submit_license_extension: string;
}

export class NotifySalesChangeLicenseDto {
  @ApiProperty()
  @IsString()
  optic_number: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  license_id: string;
}

export class DeleteCustomerDto {
  @ApiProperty()
  @IsString()
  reason: string;
}

export class CountriesListDto {
  @ApiProperty()
  @IsOptional()
  search: string;
}

export class PresignedUploadDto {
  @ApiProperty()
  @IsString()
  filename: string;
}

export class ResendConfirmationDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  app_id: string;
}

export class TokenRefreshDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class CreatePrivacyRequestDto {
  @ApiProperty({
    enum: ['access', 'rectification', 'erasure', 'restriction', 'objection', 'portability'],
  })
  @IsString()
  request_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Free-form request payload such as requested fields or correction details.',
  })
  @IsOptional()
  payload: Record<string, any>;
}
