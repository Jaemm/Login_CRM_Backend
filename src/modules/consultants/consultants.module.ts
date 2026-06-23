import { MiddlewareConsumer, Module, RequestMethod, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConsultantsController } from './consultants.controller';
import { ConsultantsService } from './consultants.service';
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
import { ConsultantPositionsModule } from '../consultantPositions/consultantPositions.module';
import { StoreModule } from '../stores/stores.module';
import { ConsultantShopsModule } from '../consultantShops/consultantShops.module';
import { GendersModule } from '../genders/genders.module';
import { CountriesModule } from '../countries/countries.module';
import { SkinColorGroupsModule } from '../skinColorGroups/skinColorGroups.module';
import { EthinicitiesModule } from '../ethinicities/ethinicities.module';
import { ApplicationsModule } from '../applications/applications.module';
import { ConsultantBranchesModule } from '../consultantBranches/consultantBranches.module';
import { LicenceModule } from '../licence/licence.module';
import { ProductsModule } from '../products/products.module';
import { CustomersModule } from '../customers/customers.module';
import { Versions } from '@/src/common/entities/crmEntities/Versions.entity';
import { CRMModule } from '../crm/crm.module';
import { Notifications } from '@/src/common/entities/crmEntities/Notifications.entity';
import { WebResultManagement } from '@/src/common/entities/crmEntities/WebResultManagement.entity';
import { ActiveStorageModule } from '../activeStorage/activeStorage.module';
import { ActiveStorageBlobs } from '@/src/common/entities/crmEntities/ActiveStorageBlobs.entity';
import { AdminUsersService } from '../adminUser/adminUser.service';
import { AdminUsersModule } from '../adminUser/adminUser.module';
import { ConsultantLog } from '@/src/common/entities/crmEntities/ConsultantLog.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      WebResultManagement,
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
      Notifications,
      ActiveStorageBlobs,
      ConsultantLog,
    ]),
    AuthModule,
    ConsultantCompanyModule,
    ConsultantPositionsModule,
    StoreModule,
    ConsultantsModule,
    ConsultantShopsModule,
    GendersModule,
    CountriesModule,
    SkinColorGroupsModule,
    EthinicitiesModule,
    ApplicationsModule,
    ConsultantBranchesModule,
    LicenceModule,
    forwardRef(() => ProductsModule),
    CustomersModule,
    CRMModule,
    ActiveStorageModule,
    AdminUsersModule,
  ],
  controllers: [ConsultantsController],
  providers: [
    ConsultantsService,
    AuthService,
    JwtService,
    ConsultantCompanyService,
    DeviceService,
    AdminUsersService,
  ],
  exports: [ConsultantsService],
})
export class ConsultantsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: 'consultants',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/change_email',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/login/phone',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/update',
        method: RequestMethod.PUT,
      },
      {
        path: 'consultants/me',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/crmsync',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/password_change',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/logout',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/delete_account',
        method: RequestMethod.DELETE,
      },
      {
        path: 'consultants/resend-confirmation',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/:id/confirm',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/:id/confirm_email.html',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/all-license',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/change-license',
        method: RequestMethod.PUT,
      },
      {
        path: 'consultants/notify_sales_change_license',
        method: RequestMethod.PUT,
      },
      {
        path: 'consultants/calculate-price',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/update-license',
        method: RequestMethod.PUT,
      },
      {
        path: 'consultants/renew-devices',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/product_recommendations',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/products/enter',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/brevo/resync-newsletters',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/request_callback_url',
        method: RequestMethod.POST,
      },
      {
        path: 'consultants/customers/:id',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/notifications',
        method: RequestMethod.GET,
      },
      {
        path: 'consultants/notifications/:id',
        method: RequestMethod.DELETE,
      },
      {
        path: 'consultants/logs',
        method: RequestMethod.GET,
      },
    );
  }
}
