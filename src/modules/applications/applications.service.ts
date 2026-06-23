import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, Repository } from 'typeorm';
import { Applications } from '@/src/common/entities/crmEntities/Applications.entity';
import { ApplicationsVersionCheckDto } from './applications.dto';
import { CommonService } from '@/src/common/common.service';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ActiveStorageService } from '../activeStorage/activeStorage.service';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Applications)
    private readonly ApplicationsRepository: Repository<Applications>,
    private activeStorageService: ActiveStorageService,
    private readonly commonService: CommonService,
  ) {}

  async findOneApplication(id: number, consultantCompanyId?: string) {
    const application: any = await this.ApplicationsRepository.findOne({
      where: { id },
    });

    if (!application) {
      this.commonService.throwNotFoundError();
    }

    const appMedia = await this.getApplicationMedia(String(id), consultantCompanyId);
    application.icon = appMedia?.icon;

    return application;
  }

  async findApplications(conditions?: any, selections?: string[], includes?: string[]) {
    const application = await this.ApplicationsRepository.find({
      where: conditions,
      select: selections ? (selections as FindOptionsSelect<Applications>) : [],
      relations: includes,
    });

    if (!application) {
      this.commonService.throwNotFoundError();
    }

    return application;
  }

  async applicationVersionCheck(appData: ApplicationsVersionCheckDto) {
    const { app_id, operating_system } = appData;

    // DB 조회
    const applications = await this.findApplications({ id: Number(app_id) }, [
      'id',
      'old_ios_version',
      'old_android_version',
      'ios_version',
      'android_version',
    ]);

    const application = applications[0];
    if (!application) {
      this.commonService.throwNotFoundError();
    }

    /**
     * 버전 비교 함수
     * - current / previous 중 하나라도 없으면 비교 스킵 → 통과
     */
    const checkVersionInvalid = (current?: string | null, previous?: string | null): boolean => {
      if (!current || !previous) {
        return false;
      }
      return current <= previous;
    };

    const iosInvalid =
      operating_system === 'ios' &&
      checkVersionInvalid(application.ios_version, application.old_ios_version);

    const aosInvalid =
      operating_system === 'aos' &&
      checkVersionInvalid(application.android_version, application.old_android_version);

    // 차단 로직
    if (iosInvalid || aosInvalid) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    // 정상 응답
    return {
      message: 'Success!',
      app_id,
      app_version:
        operating_system === 'aos' ? application.android_version : application.ios_version,
      operating_system,
      old_ios_version: application.old_ios_version,
      old_android_version: application.old_android_version,
    };
  }

  async applicationVersionCheckV2(appData: ApplicationsVersionCheckDto) {
    const { app_id, operating_system } = appData;

    const applications = await this.findApplications({ id: Number(app_id) }, [
      'id',
      'old_ios_version',
      'old_android_version',
      'ios_version',
      'android_version',
      'ios_app_url',
      'android_app_url',
      'apk_url',
      'cancel',
    ]);

    const application = applications[0];
    if (!application) {
      this.commonService.throwNotFoundError();
    }

    const apkActiveStorageUrl = await this.activeStorageService.getActiveStorageDownloadUrl(
      'Application',
      String(app_id),
      'apk',
    );

    const storeUrl =
      operating_system === 'aos'
        ? application.android_app_url ?? null
        : application.ios_app_url ?? null;
    const apkUrl =
      operating_system === 'aos' ? apkActiveStorageUrl ?? application.apk_url ?? null : null;
    const appVersion =
      operating_system === 'aos' ? application.android_version : application.ios_version;
    const oldVersion =
      operating_system === 'aos' ? application.old_android_version : application.old_ios_version;

    return {
      app_id,
      app_version: appVersion,
      old_version: oldVersion,
      operating_system,
      store_url: storeUrl,
      apk_url: apkUrl,
      cancel: application.cancel,
    };
  }

  private async getApplicationMedia(applicationId: string, consultantCompanyId?: string) {
    const activeStorageItems = await this.activeStorageService.getActiveStorageItems(
      'Application',
      applicationId,
    );
    const companyLogoItems = await this.activeStorageService.getActiveStorageItems(
      'ConsultantCompany',
      consultantCompanyId,
    );

    const iconItem = activeStorageItems.find((item) => item.type === 'icon');
    const logoCompany = companyLogoItems.find((item) => item.type === 'icon');
    const icon = iconItem?.url || logoCompany?.url || null;

    const apkItem = activeStorageItems.find((item) => item.type === 'apk');
    const apk = apkItem?.url || null;

    return { icon, apk };
  }
}
