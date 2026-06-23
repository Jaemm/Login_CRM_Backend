import { MiddlewareConsumer, Module, RequestMethod, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Consultants } from '@/src/common/entities/crmEntities/Consultants.entity';
import { ConsultantShops } from '@/src/common/entities/crmEntities/ConsultantShops.entity';
import { ConsultantBranches } from '@/src/common/entities/crmEntities/ConsultantBranches.entity';
import { ConsultantCompanies } from '@/src/common/entities/crmEntities/ConsultantCompanies.entity';
import { DoWrite } from '@/src/common/entities/crmEntities/DoWrite.entity';
import { AdminUsers } from '@/src/common/entities/crmEntities/AdminUsers.entity';
import { Countries } from '@/src/common/entities/crmEntities/Countries.entity';
import { Customers } from '@/src/common/entities/crmEntities/Customers.entity';
import { ChowisCustomerConsents } from '@/src/common/entities/crmEntities/ChowisCustomerConsents.entity';
import { CustomerApplications } from '@/src/common/entities/crmEntities/CustomerApplications.entity';
import { Applications } from '@/src/common/entities/crmEntities/Applications.entity';
import { Products } from '@/src/common/entities/crmEntities/Products.entity';
import { Devices } from '@/src/common/entities/crmEntities/Devices.entity';
import { Licenses } from '@/src/common/entities/crmEntities/Licenses.entity';
import { LicenseHistories } from '@/src/common/entities/crmEntities/LicenseHistories.entity';
import { Ethnicities } from '@/src/common/entities/crmEntities/Ethnicities.entity';
import { SkinColorGroups } from '@/src/common/entities/crmEntities/SkinColorGroups.entity';
import { Genders } from '@/src/common/entities/crmEntities/Genders.entity';
import { ConsultantPositions } from '@/src/common/entities/crmEntities/ConsultantPositions.entity';
import { ActiveStorageAttachments } from '@/src/common/entities/crmEntities/ActiveStorageAttachments.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { DeviceModule } from '../devices/devices.module';
import { ApplicationsModule } from '../applications/applications.module';
import { CustomersModule } from '../customers/customers.module';
import { ConsultantsModule } from '../consultants/consultants.module';
import { Versions } from '@/src/common/entities/crmEntities/Versions.entity';
import { AuthMiddleware } from '@/src/common/middleWare/authMiddlware/auth.middleware';
import { ProductsMultiConnect } from '@/src/common/entities/crmEntities/ProductsMultiConnect.entity';
import { ConsultantCompanyService } from '../consultantCompany/consultantCompany.service';
import { ActiveStorageBlobs } from '@/src/common/entities/crmEntities/ActiveStorageBlobs.entity';
import { ActiveStorageModule } from '../activeStorage/activeStorage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consultants,
      ConsultantShops,
      ConsultantBranches,
      ConsultantCompanies,
      DoWrite,
      AdminUsers,
      Countries,
      Customers,
      ChowisCustomerConsents,
      CustomerApplications,
      Applications,
      Products,
      Devices,
      Licenses,
      LicenseHistories,
      Ethnicities,
      SkinColorGroups,
      Genders,
      ConsultantPositions,
      ActiveStorageAttachments,
      Versions,
      ProductsMultiConnect,
      ActiveStorageBlobs,
    ]),
    DeviceModule,
    ApplicationsModule,
    ApplicationsModule,
    forwardRef(() => ConsultantsModule),
    CustomersModule,
    ActiveStorageModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ConsultantCompanyService],
  exports: [ProductsService],
})
export class ProductsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({
      path: 'products/enter',
      method: RequestMethod.POST,
    });
  }
}
