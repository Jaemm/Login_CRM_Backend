import { IsNumberOrString } from '@/src/common/validators/number-or-string.validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Validate } from 'class-validator';

export class CustomerConsentsDto {
  @ApiProperty()
  @Validate(IsNumberOrString)
  customer_id: string | number;

  @ApiProperty()
  @IsOptional()
  consultant_id: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  consent_type: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  consent_form_answers: string;

  @ApiProperty()
  @IsOptional()
  consent_version: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  consent_text: string;

  @ApiProperty()
  @IsOptional()
  data_transfer: any;

  @ApiProperty()
  @IsOptional()
  data_privacy: any;

  @ApiProperty({
    description:
      'I agree that my E-mail address will be used to receive the License termination/renewal notice from Chowis Co., Ltd.',
  })
  @IsOptional()
  receive_license_notification: boolean;

  @ApiProperty({
    description:
      'I agree that my E-mail address will be used to receive the news letter and marketing offers on products and services from chowis Co. Ltd.',
  })
  @IsBoolean()
  @IsOptional()
  receive_newsletter: boolean;

  @ApiProperty({
    description: 'Save additional consent information',
  })
  @IsString()
  @IsOptional()
  additional_information: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  withdrawal_reason: string;
}

export class WithdrawCustomerConsentDto {
  @ApiProperty()
  @Validate(IsNumberOrString)
  consent_id: string | number;

  @ApiProperty()
  @Validate(IsNumberOrString)
  customer_id: string | number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  withdrawal_reason: string;
}
