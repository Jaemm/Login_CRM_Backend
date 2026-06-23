import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AwsS3Module } from '@/src/common/awsS3/awsS3.module';
import { ActiveStorageService } from './activeStorage.service';
import { ActiveStorageAttachments } from '@/src/common/entities/crmEntities/ActiveStorageAttachments.entity';
import { ActiveStorageBlobs } from '@/src/common/entities/crmEntities/ActiveStorageBlobs.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActiveStorageAttachments, ActiveStorageBlobs]), AwsS3Module],
  providers: [ActiveStorageService],
  exports: [ActiveStorageService],
})
export class ActiveStorageModule {}
