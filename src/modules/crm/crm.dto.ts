import { IsNumberOrString } from '@/src/common/validators/number-or-string.validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
} from 'class-validator';

export class UpdateConsentForm {
  @ApiProperty({ example: '111111' })
  @IsString()
  consent_form_answers: string;

  @ApiProperty({ example: 1 })
  @Validate(IsNumberOrString)
  customer_id: number;

  @ApiProperty()
  @IsString()
  consent_type: string;

  @ApiProperty({ example: '1' })
  @Validate(IsNumberOrString)
  batch_id: string;

  @ApiProperty({ example: 'www.example.com' })
  @IsString()
  url: string;
}

export class GetPrivacyRequestsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  request_type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Validate(IsNumberOrString)
  customer_id: string;
}

export class HandlePrivacyRequestDto {
  @ApiProperty({
    enum: ['processing', 'completed', 'rejected'],
    required: false,
    default: 'completed',
  })
  @IsOptional()
  @IsString()
  @IsIn(['processing', 'completed', 'rejected'])
  status: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  response_message: string;

  @ApiProperty({ required: false, description: 'Used for rectification requests.' })
  @IsOptional()
  payload: Record<string, any>;
}

export class CustomerSyncDto {
  @ApiProperty({ example: 'qa@example.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: '010000000' })
  @IsString()
  phone_number: string;

  @ApiProperty({ example: 'backend' })
  @IsString()
  name: string;

  @ApiProperty({ example: '1' })
  @Validate(IsNumberOrString)
  customer_id: string;

  @ApiProperty()
  @IsArray()
  diagnosis_info: DiagnosisInfo[];
}

class DiagnosisInfo {
  batch_id: number;
  measurements: Measurement[];
}

class Measurement {
  measurement_value: string;
  original_image: string;
  result_image: string;
}

export class PresignedUploadDto {
  @ApiProperty()
  @IsOptional()
  file_name: string;

  @ApiProperty()
  @IsOptional()
  consent_type: string;

  @ApiProperty()
  @Validate(IsNumberOrString)
  @IsOptional()
  customer_id: string;
}

export class GetByEmailDto {
  @ApiProperty({ example: 'qa@example.com' })
  @IsString()
  email: string;
}

export class GetCustomerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  surname: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  page: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  per: string;
}

export class UpdateCrmCustomersDto {
  @ApiProperty({
    example: 'qa@example.com',
  })
  @IsOptional()
  @ValidateIf((o) => o.email !== '')
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '9876886544',
  })
  @IsOptional()
  phone: string;

  @ApiProperty({
    example: 'Nice',
  })
  @IsOptional()
  name: string;

  @ApiProperty({
    example: 'Nice',
  })
  @IsOptional()
  surname: string;

  @ApiProperty({
    example: 'IOS',
  })
  @IsOptional()
  os: string;

  @ApiProperty({
    example: 'en',
  })
  @IsOptional()
  language: string;

  @ApiProperty({
    example: '2000',
  })
  @IsOptional()
  birth: string;

  @ApiProperty({
    example: 'SUWON',
  })
  @IsOptional()
  address: string;

  @ApiProperty({
    example: '44',
  })
  @Validate(IsNumberOrString)
  @IsOptional()
  app_id: number;

  @ApiProperty({
    example: '20',
  })
  @IsOptional()
  age: number;

  @ApiProperty({
    example: 1,
  })
  @Validate(IsNumberOrString)
  @IsOptional()
  skin_color_group_id: number;

  @ApiProperty({
    example: 1,
  })
  @Validate(IsNumberOrString)
  @IsOptional()
  ethnicity_id: number;

  @ApiProperty({
    example: 'Suwon',
  })
  @IsOptional()
  city: string;

  @ApiProperty({ example: 'Suwon' })
  @IsOptional()
  state: string;

  @ApiProperty({ example: '0000' })
  @IsOptional()
  zip_code: string;

  @ApiProperty({ example: '82' })
  @IsOptional()
  phone_country_code: string;

  @ApiProperty({ example: 'KR' })
  @Transform(({ value }) => value.toUpperCase())
  @IsOptional()
  country_code: string;

  @ApiProperty({ example: '1' })
  @Validate(IsNumberOrString)
  @IsOptional()
  gender_id: string;

  @ApiProperty({ example: 1 })
  @Validate(IsNumberOrString)
  @IsOptional()
  consultant_shop_id: number;

  @ApiProperty({ example: 1 })
  @Validate(IsNumberOrString)
  @IsOptional()
  social_id: string;

  @ApiProperty({ example: 1 })
  @IsOptional()
  social: string;

  @ApiProperty({ example: 1 })
  @IsOptional()
  note: string;

  @ApiProperty({ example: 'Korea' })
  @Transform(({ value }) => value.toLowerCase())
  @IsOptional()
  country_name: string;

  @ApiProperty({ example: 1 })
  @Validate(IsNumberOrString)
  @IsOptional()
  country_id: number;

  @ApiProperty({ example: 1 })
  @Validate(IsNumberOrString)
  @IsOptional()
  company_id: number;

  @IsOptional()
  consultant_id: number;

  @IsOptional()
  external_id: string;

  @IsOptional()
  email_confirmed: boolean;

  @IsOptional()
  confirm_token: string;

  @ApiProperty()
  @IsOptional()
  memo: string;

  @IsOptional()
  company_name: string;

  @IsOptional()
  company_address: string;

  @IsOptional()
  position: string;

  @IsOptional()
  branch: string;

  @IsOptional()
  status: number;

  @IsOptional()
  callback_url: string;

  @IsOptional()
  is_active: number;

  @IsOptional()
  code: string;

  @IsOptional()
  otp_token: string;

  @IsOptional()
  otp_valid_til: string;

  @IsOptional()
  countries: string;

  @IsOptional()
  confirmation_sent_at: Date;

  @IsOptional()
  confirmed_at: string;

  @IsOptional()
  unconfirmed_email: string;

  @IsOptional()
  register_for_crm: boolean;

  @IsOptional()
  email_subscription: boolean;

  @IsOptional()
  password: string;

  @ApiProperty({
    example: false,
    description:
      'By default the value is false. In case the customer is created with quick_analysis as true then he will be excluded from the crm list',
  })
  @IsOptional()
  quick_analysis: boolean;

  service: any;
}

export class GetCustomerLogDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  action_type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customer_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  consultant_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  app_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  created_from: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  created_to: string;

  @ApiProperty({ required: false, example: '1' })
  @IsOptional()
  @IsString()
  page: string;

  @ApiProperty({ required: false, example: '20' })
  @IsOptional()
  @IsString()
  per: string;
}
