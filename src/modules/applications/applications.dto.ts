import { IsNumberOrString } from '@/src/common/validators/number-or-string.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Validate } from 'class-validator';

export class ApplicationsVersionCheckDto {
  @ApiProperty()
  @Validate(IsNumberOrString)
  app_id: string;

  @ApiProperty({
    enum: ['ios', 'aos'],
  })
  @Transform(({ value }) => value.toLowerCase())
  @IsString()
  @IsIn(['ios', 'aos'])
  operating_system: string;
}

export class ApplicationsVersionCheckResponseDto {
  @ApiProperty({ example: 'Success!' })
  message: string;

  @ApiProperty({ example: '1' })
  app_id: string;

  @ApiPropertyOptional({ example: '1.2.3', nullable: true })
  app_version: string | null;

  @ApiProperty({ enum: ['ios', 'aos'], example: 'ios' })
  operating_system: string;

  @ApiPropertyOptional({ example: '1.0.0', nullable: true })
  old_ios_version: string | null;

  @ApiPropertyOptional({ example: '1.0.0', nullable: true })
  old_android_version: string | null;
}

export class ApplicationsVersionCheckV2DataDto {
  @ApiProperty({ example: '1' })
  app_id: string;

  @ApiPropertyOptional({ example: '1.2.3', nullable: true })
  app_version: string | null;

  @ApiPropertyOptional({ example: '1.0.0', nullable: true })
  old_version: string | null;

  @ApiProperty({ enum: ['ios', 'aos'], example: 'ios' })
  operating_system: string;

  @ApiPropertyOptional({
    example: 'https://apps.apple.com/us/app/example/id123456',
    nullable: true,
  })
  store_url: string | null;

  @ApiPropertyOptional({
    example: 'https://d37orfceubonsg.cloudfront.net/abc?download_name=file.apk',
    nullable: true,
  })
  apk_url: string | null;

  @ApiProperty({ example: true })
  cancel: boolean;
}

export class ApplicationsVersionCheckV2ResponseDto {
  @ApiProperty({ example: 0 })
  result_code: number;

  @ApiProperty({ example: 'Success!' })
  message: string;

  @ApiProperty({ type: ApplicationsVersionCheckV2DataDto })
  data: ApplicationsVersionCheckV2DataDto | null;
}
