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
import { CustomerConsentsService } from './customerConsents.service';
import { CustomerConsentsController } from './customerConsents.controller';
import { AuthMiddleware } from '@/src/common/middleWare/authMiddlware/auth.middleware';
import { ConsultantsModule } from '../consultants/consultants.module';
import { CustomersModule } from '../customers/customers.module';
import { WebResultManagement } from '@/src/common/entities/crmEntities/WebResultManagement.entity';
import { ChowisCustomerConsentHistories } from '@/src/common/entities/crmEntities/ChowisCustomerConsentHistories.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consultants,
      WebResultManagement,
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
      ChowisCustomerConsentHistories,
    ]),
    forwardRef(() => ConsultantsModule),
    forwardRef(() => CustomersModule),
  ],
  controllers: [CustomerConsentsController],
  providers: [CustomerConsentsService],
})
export class CustomerConsentsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'customer_consents/create',
        method: RequestMethod.POST,
      },
      {
        path: 'customer_consents/for_consultant_create',
        method: RequestMethod.POST,
      },
      {
        path: 'customer_consents/for_consultant_update',
        method: RequestMethod.PUT,
      },
      {
        path: 'customer_consents/update',
        method: RequestMethod.PUT,
      },
      {
        path: 'customer_consents/withdraw',
        method: RequestMethod.POST,
      },
      {
        path: 'customer_consents/brevo/resync-newsletters',
        method: RequestMethod.POST,
      },
    );
  }
}
