import {
  IsNumberOrString,
  BooleanTransformer,
} from '@/src/common/validators/number-or-string.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, Validate, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
export class ConsultantDto {
  @ApiProperty({
    example: 'paul@example.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    example: 44,
  })
  @Validate(IsNumberOrString)
  app_id: string | number;

  @ApiProperty({
    example: 'Production2024@',
  })
  @IsString()
  password: string;

  confirmPassword: string;

  email_confirmed: any;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @Validate(BooleanTransformer)
  is_hair_skin: boolean | null;

  @IsOptional()
  is_agent: boolean | null;

  @ApiPropertyOptional({ example: 2, description: '기본 회사 ID(미전달 시 규칙에 따라 자동 지정)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consultant_company_id?: number;

}
export class UpdateConsultantDto {
  @ApiPropertyOptional({ example: 'paul@example.com' })
  @IsOptional()
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: '010-0000-0000' })
  @IsOptional()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'Production2024@' })
  @IsOptional()
  @IsString()
  new_password: string;

  @ApiPropertyOptional({ example: 'Chowis' })
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Backend' })
  @IsOptional()
  @IsString()
  surname: string;

  @ApiPropertyOptional({ example: 'IOS' })
  @IsOptional()
  @IsString()
  os: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  language: string;

  @ApiPropertyOptional({ example: '20000101' })
  @IsOptional()
  @IsString()
  birthdate: string;

  @ApiPropertyOptional({ example: 'Korea' })
  @IsOptional()
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: '44' })
  @IsOptional()
  @Validate(IsNumberOrString)
  app_id: string;

  @ApiPropertyOptional({ example: 'Suwon' })
  @IsOptional()
  @IsString()
  city: string;

  @ApiPropertyOptional({ example: 'Suwon' })
  @IsOptional()
  @IsString()
  state: string;

  @ApiPropertyOptional({ example: '0000' })
  @IsOptional()
  @IsString()
  zip_code: string;

  @ApiPropertyOptional({ example: '82' })
  @IsOptional()
  @IsString()
  phone_country_code: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Validate(IsNumberOrString)
  country_id: number;

  @ApiPropertyOptional({ example: 'KR' })
  @IsOptional()
  @IsString()
  country_code: string;

  @ApiPropertyOptional({ example: 'KR' })
  @IsOptional()
  @IsString()
  country: string;

  @ApiPropertyOptional({ example: 'Korea' })
  @IsOptional()
  @IsString()
  country_name: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  consultant_shop_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  push_token: string;

  @ApiPropertyOptional({ example: 'memo' })
  @IsOptional()
  @IsString()
  memo: string;

  @ApiPropertyOptional({ example: 'Company' })
  @IsOptional()
  @IsString()
  company_name: string;

  @ApiPropertyOptional({ example: 'Address' })
  @IsOptional()
  @IsString()
  company_address: string;

  @ApiPropertyOptional({ example: 'branch' })
  @IsOptional()
  @IsString()
  branch: string;

  @ApiPropertyOptional({ example: 'position' })
  @IsOptional()
  @IsString()
  position: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @Validate(IsNumberOrString)
  skin_color_group_id: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @Validate(IsNumberOrString)
  ethnicity_id: string;

  @ApiPropertyOptional({ example: 'callback_url' })
  @IsOptional()
  @IsString()
  callback_url: string;

  @ApiPropertyOptional({ example: 'code' })
  @IsOptional()
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  is_agent: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  consultant_company_id: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Validate(IsNumberOrString)
  gender_id?: number;

}

export class GetConsultantDto {
  @ApiPropertyOptional({
    type: String,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  company_ids: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    default: [],
  })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  shop_ids: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    default: [],
  })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  position_ids: string[];

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    default: [],
  })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  country_ids: string[];
}

export class GetConsultantLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action_type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consultant_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  app_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  created_from: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  created_to: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  per: string;
}

export class ResendConfirmationDto {
  @ApiProperty({
    example: 'paul@example.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    example: '44',
  })
  @Validate(IsNumberOrString)
  app_id: string;
}

export class ChangeEmailDto {
  @ApiProperty({
    example: 'paul@example.com',
  })
  @IsString()
  email: string;
}

export class PasswordDto {
  @ApiProperty({
    example: 'paul@example.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    example: 'paul@example.com',
  })
  @Validate(IsNumberOrString)
  app_id: string;
}

export class PasswrodChangeDto {
  @ApiProperty({
    example: 'Production2024@',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: 'Production2024@',
  })
  @IsString()
  new_password: string;
}

export class ConfirmHtmlDto {
  @ApiProperty()
  @IsString()
  token: string;
}

export class ConsultantCompanyDetailsDto {
  @ApiProperty({
    example: '1',
  })
  @Validate(IsNumberOrString)
  consultant_company_id: string;
}

class BatchDto {
  @ApiProperty({ type: String })
  @IsString()
  analysis_type: string;

  @ApiProperty({ type: String })
  @Validate(IsNumberOrString)
  batch_id: string;
}

export class RequestCallBackUrlDto {
  @ApiProperty({
    type: BatchDto,
    isArray: true,
  })
  @IsArray()
  batch_ids: BatchDto[];

  @ApiProperty()
  @Validate(IsNumberOrString)
  customer_id: string;
}

export class AllLicenseDto {
  @ApiProperty({
    example: '44',
  })
  @Validate(IsNumberOrString)
  application_id: string;

  @ApiProperty({
    example: 'FAC01229',
  })
  @IsString()
  optic_number: string;
}

export class ChangeLicenseDto {
  @ApiProperty({
    example: 'FAC01229',
  })
  @IsString()
  optic_number: string;

  @ApiProperty({
    example: '6',
  })
  @Validate(IsNumberOrString)
  license_id: string;
}

export class NotifySalesChangeLicenseDto {
  @ApiProperty({
    example: 'FAC01229',
  })
  @IsString()
  optic_number: string;

  @ApiProperty({
    example: '6',
  })
  @Validate(IsNumberOrString)
  license_id: string;
}

export class CalculatePriceDto {
  @ApiProperty({
    description: 'Optic number comma seprated like 1,2,3',
    type: String,
  })
  @IsString()
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

export class LoginSocialDto {
  @ApiProperty({
    example: 'google',
  })
  @IsString()
  social_provider: string;

  @ApiProperty({
    example: 'b2c',
  })
  @IsString()
  app_type: string;

  @ApiProperty({
    example: '',
  })
  @Validate(IsNumberOrString)
  tokenId: string;

  @ApiProperty({
    example: '44',
  })
  @Validate(IsNumberOrString)
  app_id: string;
}

export class LoginPhoneDto {
  @ApiProperty({
    example: '010000000',
  })
  @IsString()
  phone: string;
}

export class ProductRecommendationsDto {
  @ApiPropertyOptional({
    example: '1',
  })
  @IsOptional()
  @IsString()
  page: string;

  @ApiPropertyOptional({
    example: '20',
  })
  @IsOptional()
  @IsString()
  limit: string;
}

export class TokenRefreshDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh_token: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token: string;
}

export class EnterProductDto {
  @ApiProperty({
    example: 'FAC01229',
  })
  @IsOptional()
  optic_number: string;

  @ApiProperty({
    example: 'CH7950',
  })
  @IsOptional()
  password: string;

  @ApiProperty({
    example: 44,
  })
  @Validate(IsNumberOrString)
  @IsOptional()
  application_id: string;

  @ApiProperty({
    example: 'CND02RA-L2-00736',
  })
  @IsOptional()
  mac_address: string;

  @ApiProperty({
    example: '2024-07-07',
  })
  @IsOptional()
  first_use_date: string;

  @ApiProperty({
    example: '37.564',
  })
  @IsOptional()
  lat: string;

  @ApiProperty({
    example: '26.6963',
  })
  @IsOptional()
  lng: string;
}

export class GetNotificationsDto {
  @ApiProperty({ required: false, example: '1' })
  @IsOptional()
  @IsString()
  page: string;

  @ApiProperty({ required: false, example: '10' })
  @IsOptional()
  @IsString()
  per: string;

  @ApiProperty({ required: false, example: '' })
  @IsOptional()
  @IsString()
  title: string;
}

export class UpdatePasswordDto {
  @ApiProperty({
    example: '44',
  })
  @IsString()
  app_id: string;

  @ApiProperty()
  @IsString()
  recoveryPasswordToken: string;

  @ApiProperty({
    example: 'qa1@example.com',
  })
  @IsString()
  email: string;

  @ApiProperty({
    example: 'hsjeongChowis1',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: 'hsjeongChowis1',
  })
  @IsString()
  confirmPassword: string;
}
