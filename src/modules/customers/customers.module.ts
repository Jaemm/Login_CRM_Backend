import { MiddlewareConsumer, Module, RequestMethod, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Consultants } from '@/src/common/entities/crmEntities/Consultants.entity';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { JwtService } from 'src/jwt/jwt.service';
import { ConsultantShops } from '@/src/common/entities/crmEntities/ConsultantShops.entity';
import { ConsultantBranches } from '@/src/common/entities/crmEntities/ConsultantBranches.entity';
import { ConsultantCompanies } from '@/src/common/entities/crmEntities/ConsultantCompanies.entity';
import { DoWrite } from '@/src/common/entities/crmEntities/DoWrite.entity';
import { AdminUsers } from '@/src/common/entities/crmEntities/AdminUsers.entity';
import { Countries } from '@/src/common/entities/crmEntities/Countries.entity';
import { Customers } from '@/src/common/entities/crmEntities/Customers.entity';
import { ChowisCustomerConsents } from '@/src/common/entities/crmEntities/ChowisCustomerConsents.entity';
import { CustomerApplications } from '@/src/common/entities/crmEntities/CustomerApplications.entity';
import { CustomerPrivacyRequests } from '@/src/common/entities/crmEntities/CustomerPrivacyRequests.entity';
import { Applications } from '@/src/common/entities/crmEntities/Applications.entity';
import { Products } from '@/src/common/entities/crmEntities/Products.entity';
import { Devices } from '@/src/common/entities/crmEntities/Devices.entity';
import { Licenses } from '@/src/common/entities/crmEntities/Licenses.entity';
import { LicenseHistories } from '@/src/common/entities/crmEntities/LicenseHistories.entity';
import { Ethnicities } from '@/src/common/entities/crmEntities/Ethnicities.entity';
import { SkinColorGroups } from '@/src/common/entities/crmEntities/SkinColorGroups.entity';
import { Genders } from '@/src/common/entities/crmEntities/Genders.entity';
import { ConsultantPositions } from '@/src/common/entities/crmEntities/ConsultantPositions.entity';
import { ConsultantCompanyService } from '../consultantCompany/consultantCompany.service';
import { ActiveStorageAttachments } from '@/src/common/entities/crmEntities/ActiveStorageAttachments.entity';
import { ConsultantCompanyModule } from '../consultantCompany/consultantCompany.module';
import { DeviceService } from '../devices/devices.service';
import { AuthMiddleware } from '@/src/common/middleWare/authMiddlware/auth.middleware';
import { ConsultantsService } from '../consultants/consultants.service';
import { ConsultantPositionsService } from '../consultantPositions/consultantPositions.service';
import { ConsultantShopsService } from '../consultantShops/consultantShops.service';
import { GendersService } from '../genders/genders.service';
import { ApplicationsService } from '../applications/applications.service';
import { CountriesService } from '../countries/countries.service';
import { EthinicitiesService } from '../ethinicities/ethinicities.service';
import { SkinColorGroupsService } from '../skinColorGroups/skinColorGroups.service';
import { StoreModule } from '../stores/stores.module';
import { ConsultantBranchesModule } from '../consultantBranches/consultantBranches.module';
import { LicenceModule } from '../licence/licence.module';
import { ProductsModule } from '../products/products.module';
import { ActiveStorageModule } from '../activeStorage/activeStorage.module';
import { Versions } from '@/src/common/entities/crmEntities/Versions.entity';
import { CustomerLog } from '@/src/common/entities/crmEntities/CustomerLog.entity';
import { ConsultantLog } from '@/src/common/entities/crmEntities/ConsultantLog.entity';
import { Notifications } from '@/src/common/entities/crmEntities/Notifications.entity';
import { WebResultManagement } from '@/src/common/entities/crmEntities/WebResultManagement.entity';
import { ApplicationsModule } from '../applications/applications.module';
import { ActiveStorageBlobs } from '@/src/common/entities/crmEntities/ActiveStorageBlobs.entity';
import { AdminUsersModule } from '../adminUser/adminUser.module';
import { AdminUsersService } from '../adminUser/adminUser.service';
import { ChowisCustomerConsentHistories } from '@/src/common/entities/crmEntities/ChowisCustomerConsentHistories.entity';
import { ProductsMultiConnect } from '@/src/common/entities/crmEntities/ProductsMultiConnect.entity';
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
      CustomerPrivacyRequests,
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
      CustomerLog,
      ConsultantLog,
      Notifications,
      WebResultManagement,
      ActiveStorageBlobs,
      ChowisCustomerConsentHistories,
      ProductsMultiConnect,
    ]),
    AuthModule,
    ConsultantCompanyModule,
    StoreModule,
    ConsultantBranchesModule,
    LicenceModule,
    forwardRef(() => ProductsModule),
    ApplicationsModule,
    AdminUsersModule,
    ActiveStorageModule,
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    AuthService,
    JwtService,
    ConsultantCompanyService,
    DeviceService,
    ConsultantsService,
    ConsultantPositionsService,
    ConsultantShopsService,
    GendersService,
    ApplicationsService,
    CountriesService,
    EthinicitiesService,
    SkinColorGroupsService,
    AdminUsersService,
  ],
  exports: [CustomersService],
})
export class CustomersModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).exclude('customers/confirmation').forRoutes(
      {
        path: 'customers/update',
        method: RequestMethod.PUT,
      },
      {
        path: 'customers/basic-details-customers',
        method: RequestMethod.GET,
      },
      {
        path: 'customers/me',
        method: RequestMethod.GET,
      },
      {
        path: 'customers/password_change',
        method: RequestMethod.POST,
      },
      {
        path: 'customers/logout',
        method: RequestMethod.POST,
      },
      {
        path: 'customers/resend-confirmation-customer',
        method: RequestMethod.POST,
      },
      {
        path: 'customers/shop-list',
        method: RequestMethod.GET,
      },
      {
        path: 'customers/countries-list',
        method: RequestMethod.GET,
      },
      {
        path: 'customers/:id',
        method: RequestMethod.GET,
      },
      {
        path: 'customers/delete_account',
        method: RequestMethod.DELETE,
      },
      {
        path: 'customers/all-license',
        method: RequestMethod.GET,
      },
      {
        path: 'customers/change-license',
        method: RequestMethod.PUT,
      },
      {
        path: 'customers/notify_sales_change_license',
        method: RequestMethod.PUT,
      },
      {
        path: 'customers/calculate-price',
        method: RequestMethod.GET,
      },
      {
        path: 'customers/update-license',
        method: RequestMethod.PUT,
      },
      {
        path: 'customers/renew-devices',
        method: RequestMethod.POST,
      },
    );
  }
}
