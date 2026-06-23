import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ChowisServiceService } from './chowis-service.service';
import { ChowisServiceController } from './chowis-service.controller';
import { ChowisServiceLicenseManagement } from '@/src/common/entities/crmEntities/ChowisServiceLicenseManagement.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultantsModule } from '../consultants/consultants.module';
import { Products } from '@/src/common/entities/crmEntities/Products.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChowisServiceLicenseManagement, Products]),
    ConsultantsModule,
  ],
  controllers: [ChowisServiceController],
  providers: [ChowisServiceService],
  exports: [ChowisServiceService],
})
export class ChowisServiceModule {
  configure(_consumer: MiddlewareConsumer) {}
}
