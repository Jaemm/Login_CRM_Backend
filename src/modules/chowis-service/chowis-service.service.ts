import { Injectable, Logger } from '@nestjs/common';
import { ExpirationCheckDto } from './chowis-service.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ChowisServiceLicenseManagement } from '@/src/common/entities/crmEntities/ChowisServiceLicenseManagement.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { CommonService } from '@/src/common/common.service';
import { MailDispatchService } from '@/src/common/mail-dispatch.service';
import { MailTemplateService } from '@/src/common/mail-template.service';
import { LicenseDomainService } from '@/src/common/license-domain.service';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ConsultantsService } from '../consultants/consultants.service';
import { Cron } from '@nestjs/schedule';
import { Products } from '@/src/common/entities/crmEntities/Products.entity';
import { resolveEmailBrandConfig } from '@/src/config';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class ChowisServiceService {
  private readonly logger = new Logger(ChowisServiceService.name);

  constructor(
    @InjectRepository(ChowisServiceLicenseManagement)
    private readonly licenseRepo: Repository<ChowisServiceLicenseManagement>,
    private readonly commonService: CommonService,
    private readonly mailDispatchService: MailDispatchService,
    private readonly mailTemplateService: MailTemplateService,
    private readonly licenseDomainService: LicenseDomainService,
    private consultantsService: ConsultantsService,
    private readonly monitoringService: MonitoringService,

    @InjectRepository(Products)
    private readonly productsRepo: Repository<Products>,
  ) {}

  async getOneLicense(conditions: any, selections?: any, includes?: string[]) {
    return this.licenseRepo.findOne({
      where: conditions,
      select: selections ?? {
        id: true,
        consultant_company_id: true,
        service_id: true,
        license_period: true,
        first_use_date: true,
        is_paid_subscribtion: true,
      },
      relations: includes ?? [],
    });
  }

  async updateLicense(id: number, data: any) {
    return this.licenseRepo.update(id, data);
  }

  async recordProductUsageMetrics() {
    const rows = await this.productsRepo.query(`
      SELECT
        COALESCE(a.id::text, 'unknown') AS "applicationId",
        COALESCE(NULLIF(a.name, ''), 'unknown') AS application,
        COALESCE(NULLIF(co.country_code, ''), 'unknown') AS "countryCode",
        COALESCE(NULLIF(co.name, ''), 'unknown') AS country,
        COUNT(*)::int AS "activeProducts"
      FROM products p
      LEFT JOIN applications a
        ON a.id = p.application_id
      LEFT JOIN customers c
        ON c.id = p.customer_id
      LEFT JOIN consultants cs
        ON cs.id = p.consultant_id
      LEFT JOIN countries co
        ON co.id = COALESCE(c.country_id, cs.country_id)
      WHERE p.first_use_date IS NOT NULL
        AND (p.customer_id IS NOT NULL OR p.consultant_id IS NOT NULL)
      GROUP BY
        COALESCE(a.id::text, 'unknown'),
        COALESCE(NULLIF(a.name, ''), 'unknown'),
        COALESCE(NULLIF(co.country_code, ''), 'unknown'),
        COALESCE(NULLIF(co.name, ''), 'unknown')
    `);

    if (this.monitoringService?.recordProductUsageSnapshot) {
      this.monitoringService.recordProductUsageSnapshot(rows);
    } else {
      this.logger.warn('Product usage metrics snapshot skipped: monitoring service unavailable');
    }

    return rows;
  }

  async checkLicenseExpiration(data: ExpirationCheckDto) {
    const { consultant_company_id, service_id } = data;

    if (Number(consultant_company_id) === 1) {
      return { daysRemaining: 'null' };
    }

    const license = await this.getOneLicense({
      consultant_company_id: Number(consultant_company_id),
      service_id: Number(service_id),
    });

    if (!license) {
      this.logger.warn('License not found');
      this.commonService.throwNotFoundError();
    }

    const daysRemaining = this.licenseDomainService.daysLeftFromExpired(
      license.license_period,
      license.first_use_date,
    );

    await this.updateLicense(license.id, {
      days_remaining: daysRemaining,
      days_remaining_updated_at: new Date(),
    });

    if (license.is_paid_subscribtion) {
      const differenceDays = this.licenseDomainService.elapsedDaysFrom(license.first_use_date);

      if (license.license_period <= differenceDays) {
        this.logger.warn('License expired');
        throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.PERMISSION_DENIED);
      }
    }

    return {
      success: true,
      message: 'License is valid.',
      licenseInfo: {
        consultant_company_id: license.consultant_company_id,
        service_id: license.service_id,
        daysRemaining,
        isExpired: daysRemaining <= 0,
      },
    };
  }

  @Cron('0 0 * * *')
  async handleDailyLicenseCheck() {
    const stopCronTimer = this.monitoringService.startCronTimer('daily_consultant_license_check');

    try {
      const licenses = await this.licenseRepo.find({
        where: {
          first_use_date: Not(IsNull()),
          license_period: Not(IsNull()),
          is_paid_subscribtion: true,
        },
        select: {
          id: true,
          first_use_date: true,
          license_period: true,
        },
      });

      const today = new Date();

      await Promise.all(
        licenses.map(async (license) => {
          const remainingDays = this.licenseDomainService.remainingDaysFromPeriod(
            license.license_period,
            license.first_use_date,
          );

          if (typeof remainingDays !== 'number' || isNaN(remainingDays)) {
            this.logger.warn(
              `Skipping invalid days_remaining for consultant license ID ${license.id}`,
            );
            return;
          }

          await this.licenseRepo.update(license.id, {
            days_remaining: remainingDays,
            days_remaining_updated_at: today.toISOString(),
          });
        }),
      );

      stopCronTimer('success');
      return { message: 'Consultant license check complete' };
    } catch (error) {
      stopCronTimer('failure');
      throw error;
    }
  }

  @Cron('0 0 * * *')
  async handleProductLicenseCheck() {
    const stopCronTimer = this.monitoringService.startCronTimer('daily_product_license_check');

    try {
      const isProduction = process.env.APP_ENV === 'production';
      const today = new Date();
      const blockedDomains = ['example.com', 'example.test'];
      const products = await this.productsRepo.find({
        where: {
          first_use_date: Not(IsNull()),
          license_period: Not(IsNull()),
        },
        relations: {
          customer: true,
          consultant: true,
          application: true,
          device: true,
          license: true,
        },
        select: {
          id: true,
          first_use_date: true,
          license_period: true,
          license_remaining_days: true,
          days_remaining_updated_at: true,
          customer: { id: true, email: true, name: true },
          consultant: { id: true, email: true, name: true },
          application: { id: true, name: true },
          device: { id: true, optic_number: true, consultant_company_id: true },
          license: { id: true, name: true },
        },
      });

      await Promise.all(
        products.map(async (product) => {
          const startDate = new Date(product.first_use_date);
          const remainingDays = this.licenseDomainService.remainingDaysFromPeriod(
            product.license_period,
            product.first_use_date,
          );

          if (typeof remainingDays !== 'number' || isNaN(remainingDays)) return;

          await this.productsRepo.update(product.id, {
            license_remaining_days: remainingDays,
            days_remaining_updated_at: today,
          });

          const email = product.consultant?.email || product.customer?.email;
          const emailDomain = email?.split('@')[1]?.toLowerCase();
          const shouldSendThirtyDayWarning =
            remainingDays === 30 && Number(product.license_remaining_days) !== 30;

          if (shouldSendThirtyDayWarning && email && !blockedDomains.includes(emailDomain)) {
            if (!isProduction) {
              return;
            }

            const expiredDate =
              this.licenseDomainService.expiredDate(
                product.first_use_date,
                product.license_period,
              ) ?? new Date(startDate.getTime() + product.license_period * 24 * 60 * 60 * 1000);
            const brandConfig = resolveEmailBrandConfig({
              consultantCompanyId: product.device?.consultant_company_id,
              appId: product.application?.id,
              appName: product.application?.name,
              fallbackKey: 'choicetech',
            });

            const { subject, templateContext } =
              this.mailTemplateService.buildLicenseExpiryWarningTemplate({
                brandConfig,
                name: product.consultant?.name || product.customer?.name || 'User',
                appName: product.application?.name || 'App',
                opticNumber: product.device?.optic_number || 'Unknown',
                licenseName: product.license?.name || 'Unknown',
                firstUseDate: product.first_use_date,
                expiredDate:
                  expiredDate instanceof Date
                    ? expiredDate.toISOString().split('T')[0]
                    : String(expiredDate),
                days: remainingDays,
              });

            await this.mailDispatchService.sendBrandedEmail({
              to: email,
              subject,
              templateName: 'license-expiry-warning',
              templateContext,
              from: this.mailDispatchService.buildFromAddress(brandConfig),
              emailProvider: brandConfig.emailProvider,
              appId: product.application?.id,
              appName: product.application?.name,
            });
          }
        }),
      );

      await this.recordProductUsageMetrics();

      stopCronTimer('success');
      return { message: 'Product license check complete' };
    } catch (error) {
      stopCronTimer('failure');
      throw error;
    }
  }

  async sendLicenseExpiryTestEmail(email: string, locale: string = 'en') {
    const { subject, templateContext } = this.mailTemplateService.buildLicenseExpiryWarningTemplate(
      {
        locale,
        name: 'Test User',
        appName: 'Test App',
        opticNumber: 'TEST-DEV',
        licenseName: 'Standard',
        firstUseDate: new Date(),
        expiredDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        days: 30,
      },
    );

    return this.mailDispatchService.sendBrandedEmail({
      to: email,
      subject,
      templateName: 'license-expiry-warning',
      templateContext,
    });
  }
}
