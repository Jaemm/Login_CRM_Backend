import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsS3Service } from './awsS3.service';

@Module({
  providers: [AwsS3Service, ConfigService],
  exports: [AwsS3Service],
})
export class AwsS3Module {}
