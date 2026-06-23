import { Module } from '@nestjs/common';
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
import { LicenceController } from './licence.controller';
import { LicenceService } from './licence.service';
import { ApplicationLicenses } from '@/src/common/entities/crmEntities/ApplicationLicenses.entity';

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
      ApplicationLicenses,
    ]),
  ],
  controllers: [LicenceController],
  providers: [LicenceService],
  exports: [LicenceService],
})
export class LicenceModule {}
