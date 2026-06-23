import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConsultantCompanyController } from './consultantCompany.controller';
import { ConsultantCompanyService } from './consultantCompany.service';
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
import { ActiveStorageAttachments } from '@/src/common/entities/crmEntities/ActiveStorageAttachments.entity';
import { ActiveStorageBlobs } from '@/src/common/entities/crmEntities/ActiveStorageBlobs.entity';
import { ConsultantCustomzations } from '@/src/common/entities/crmEntities/ConsultantCustomzations.entity';
import { WebResultManagement } from '@/src/common/entities/crmEntities/WebResultManagement.entity';
import { ActiveStorageModule } from '../activeStorage/activeStorage.module';
import { AuthMiddleware } from '@/src/common/middleWare/authMiddlware/auth.middleware';
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
      ActiveStorageBlobs,
      ConsultantCustomzations,
    ]),
    AuthModule,
    ActiveStorageModule,
  ],
  controllers: [ConsultantCompanyController],
  providers: [ConsultantCompanyService, AuthService, JwtService],
  exports: [ConsultantCompanyService],
})
export class ConsultantCompanyModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({
      path: 'consultant_company/:id',
      method: RequestMethod.DELETE,
    });
  }
}
