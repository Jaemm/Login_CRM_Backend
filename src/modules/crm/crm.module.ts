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
import { CustomerLog } from '@/src/common/entities/crmEntities/CustomerLog.entity';
import { CustomerPrivacyRequests } from '@/src/common/entities/crmEntities/CustomerPrivacyRequests.entity';
import { Notifications } from '@/src/common/entities/crmEntities/Notifications.entity';
import { ChowisCustomerConsentHistories } from '@/src/common/entities/crmEntities/ChowisCustomerConsentHistories.entity';
import { CRMController } from './crm.controller';
import { CRMService } from './crm.service';
import { AuthMiddleware } from '@/src/common/middleWare/authMiddlware/auth.middleware';
import { CustomersModule } from '../customers/customers.module';
import { ConsultantsModule } from '../consultants/consultants.module';
import { CountriesModule } from '../countries/countries.module';
import { ProductsModule } from '../products/products.module';
import { CustomerConsentsModule } from '../customerConsents/customerConsents.module';
import { CustomerConsentsService } from '../customerConsents/customerConsents.service';
import { JwtService } from '@/src/jwt/jwt.service';
import { ApplicationsService } from '../applications/applications.service';
import { ApplicationsModule } from '../applications/applications.module';
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
      ActiveStorageBlobs,
      CustomerLog,
      CustomerPrivacyRequests,
      Notifications,
      ChowisCustomerConsentHistories,
    ]),
    CustomersModule,
    forwardRef(() => ConsultantsModule),
    CountriesModule,
    ProductsModule,
    CustomerConsentsModule,
    ApplicationsModule,
    ActiveStorageModule,
  ],
  controllers: [CRMController],
  providers: [CRMService, CustomerConsentsService, JwtService, ApplicationsService],
  exports: [CRMService],
})
export class CRMModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'crm/customers/register',
        method: RequestMethod.POST,
      },
      {
        path: 'crm/customers/update/:id',
        method: RequestMethod.POST,
      },
      {
        path: 'crm/customers',
        method: RequestMethod.GET,
      },
      {
        path: 'crm/customers',
        method: RequestMethod.POST,
      },
      {
        path: 'crm/customers/:id',
        method: RequestMethod.GET,
      },
      {
        path: 'crm/customers/:id',
        method: RequestMethod.DELETE,
      },
      {
        path: 'crm/customers/get_by_email',
        method: RequestMethod.GET,
      },
      {
        path: 'crm/customer-logs',
        method: RequestMethod.GET,
      },
      {
        path: 'crm/privacy-requests',
        method: RequestMethod.GET,
      },
      {
        path: 'crm/privacy-requests/:id',
        method: RequestMethod.PUT,
      },
      {
        path: 'crm/customers/sync',
        method: RequestMethod.POST,
      },
      {
        path: 'crm/customers/presign_upload_consent_form',
        method: RequestMethod.POST,
      },
      {
        path: 'crm/resend-confirmation',
        method: RequestMethod.POST,
      },
      {
        path: 'crm/customers/update_consent_form',
        method: RequestMethod.PUT,
      },
    );
  }
}
