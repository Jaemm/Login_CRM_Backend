import { ConflictException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsSelect,
  FindOptionsSelectByString,
  ILike,
  In,
  Not,
  Repository,
} from 'typeorm';
import { TokenTypeEnum } from 'src/jwt/enums/auth-token.enum';

import { Consultants } from '@/src/common/entities/crmEntities/Consultants.entity';
import { AuthService } from '../auth/auth.service';
import { JwtService } from 'src/jwt/jwt.service';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import {
  ResendConfirmationDto,
  AllLicenseDto,
  CalculatePriceDto,
  ChangeEmailDto,
  ChangeLicenseDto,
  ConfirmHtmlDto,
  ConsultantCompanyDetailsDto,
  ConsultantDto,
  GetConsultantDto,
  LoginSocialDto,
  NotifySalesChangeLicenseDto,
  PasswordDto,
  RenewDevicesDto,
  RequestCallBackUrlDto,
  UpdateConsultantDto,
  UpdateLicenseDto,
  LoginPhoneDto,
  ProductRecommendationsDto,
  PasswrodChangeDto,
  EnterProductDto,
  GetNotificationsDto,
  UpdatePasswordDto,
} from '@/src/modules/consultants/consultants.dto';
import { ConsultantCompanyService } from '../consultantCompany/consultantCompany.service';
import { DeviceService } from '../devices/devices.service';
import { IMessage } from 'src/common/interfaces/message.interface';
import { CommonService } from 'src/common/common.service';
import { ErrorExceptionFactory } from 'src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { attachAirbrakeContext } from 'src/common/middleWare/exceptions/exceptionHandling/airbrake-context.util';
import { MailDispatchService } from 'src/common/mail-dispatch.service';
import { MailTemplateService } from 'src/common/mail-template.service';
import { TemplateRenderService } from 'src/common/template-render.service';
import { LicenseDomainService } from 'src/common/license-domain.service';
import { BrevoService } from 'src/common/brevo.service';
import { ConsultantPositions } from '@/src/common/entities/crmEntities/ConsultantPositions.entity';
import * as handlebars from 'handlebars';
import { ConsultantShopsService } from '../consultantShops/consultantShops.service';
import { GendersService } from '../genders/genders.service';
import { CountriesService } from '../countries/countries.service';
import { SkinColorGroupsService } from '../skinColorGroups/skinColorGroups.service';
import { EthinicitiesService } from '../ethinicities/ethinicities.service';
import { ApplicationsService } from '../applications/applications.service';
import { IJwt } from 'src/config/interfaces/jwt.interfaces';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { LicenceService } from '../licence/licence.service';
import { LicenseType } from '@/src/common/enums/license-type.enum';
import { Devices } from '@/src/common/entities/crmEntities/Devices.entity';
import axios from 'axios';
import { CustomersService } from '../customers/customers.service';
import { VersionItemType } from '@/src/common/enums/version-item-type.enum';
import { VersionEvent } from '@/src/common/enums/version-event.enum';
import { Versions } from '@/src/common/entities/crmEntities/Versions.entity';
import { Role } from '@/src/common/enums/role.enum';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { TargetType } from '@/src/common/enums/target-type.enum';
import { Notifications } from '@/src/common/entities/crmEntities/Notifications.entity';
import { Products } from '@/src/common/entities/crmEntities/Products.entity';
import { AdminUsersService } from '../adminUser/adminUser.service';
import { resolveEmailBrandConfig } from '@/src/config';
import { HttpException } from '@nestjs/common';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ConsultantLog } from '@/src/common/entities/crmEntities/ConsultantLog.entity';
import { GetConsultantLogDto } from './consultants.dto';

function getDefaultCompanyId(appId: number): number {
  const useCompany2 = [138, 137, 140, 139];
  return useCompany2.includes(Number(appId)) ? 323 : 1;
}

function resolveDefaultCompanyId(appId: number, applicationCompanyId?: number | null): number {
  const appDefaultCompanyId = getDefaultCompanyId(appId);
  if (appDefaultCompanyId !== 1) {
    return appDefaultCompanyId;
  }

  return applicationCompanyId ?? appDefaultCompanyId;
}

export interface BrevoConsultantResyncResult {
  total: number;
  synced: number;
  failed: number;
  failures: Array<{
    consultantId: string;
    email: string;
    reason: string;
  }>;
}

const CONSULTANT_RESPONSE_FIELD_ORDER = [
  'id',
  'consultant_company_id',
  'token',
  'refresh_token',
  'email',
  'social',
  'name',
  'surname',
  'phone_country_code',
  'phone',
  'os',
  'language',
  'address',
  'city',
  'state',
  'zip_code',
  'note',
  'push_token',
  'memo',
  'app_id',
  'company_name',
  'company_address',
  'branch',
  'position',
  'skin_color_group_id',
  'ethnicity_id',
  'callback_url',
  'code',
  'country_id',
  'country',
  'country_code',
  'is_hair_skin',
  'is_agent',
  'image_upload',
  'gender',
  'store',
  'optic_number',
  'country_details',
  'consultant_shop',
  'consultant_position',
  'consultant_company',
  'products',
];

function orderResponseFields<T extends Record<string, any>>(data: T, preferredOrder: string[]): T {
  const orderedData: Record<string, any> = {};

  for (const key of preferredOrder) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      orderedData[key] = data[key];
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (!Object.prototype.hasOwnProperty.call(orderedData, key)) {
      orderedData[key] = value;
    }
  }

  return orderedData as T;
}

@Injectable()
export class ConsultantsService {
  private readonly jwtConfig: IJwt;
  private readonly saltRounds = 10;
  private readonly logger = new Logger(ConsultantsService.name);

  constructor(
    @InjectRepository(Consultants)
    private readonly ConsultantsRepository: Repository<Consultants>,
    @InjectRepository(ConsultantPositions)
    private readonly position: Repository<ConsultantPositions>,
    @InjectRepository(Versions)
    private readonly versionsRepository: Repository<Versions>,
    @InjectRepository(Notifications)
    private readonly notificationRepository: Repository<Notifications>,

    @InjectRepository(Products)
    private readonly productsRepository: Repository<Products>,
    @InjectRepository(ConsultantLog)
    private readonly consultantLogRepository: Repository<ConsultantLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,

    private readonly configService: ConfigService,
    private readonly licenceService: LicenceService,
    private readonly productsService: ProductsService,
    private readonly customerService: CustomersService,
    private readonly applicationsService: ApplicationsService,
    private readonly consultantShopsService: ConsultantShopsService,
    private readonly genderService: GendersService,
    private readonly countriesService: CountriesService,
    private readonly skinColorGroupService: SkinColorGroupsService,
    private readonly ethinicityService: EthinicitiesService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly companies: ConsultantCompanyService,
    private readonly devices: DeviceService,
    private readonly commonService: CommonService,
    private readonly mailDispatchService: MailDispatchService,
    private readonly mailTemplateService: MailTemplateService,
    private readonly templateRenderService: TemplateRenderService,
    private readonly licenseDomainService: LicenseDomainService,
    private readonly brevoService: BrevoService,
    private readonly AdminUsers: AdminUsersService,
    private readonly monitoringService: MonitoringService,
  ) {
    this.jwtConfig = this.configService.get<IJwt>('jwt');
  }

  private resolveMarketingConsent(consultant: { email_subscription?: boolean | null }) {
    return consultant.email_subscription ?? false;
  }

  private async hasBrevoSyncEligibleProduct(consultantId: number) {
    const eligibleProductCount = await this.productsRepository
      .createQueryBuilder('product')
      .innerJoin('product.device', 'device')
      .where('product.consultant_id = :consultantId', { consultantId })
      .andWhere('device.agent_admin_user_id IS NULL')
      .getCount();

    return eligibleProductCount > 0;
  }

  private async migrateAppSyncConsultant(
    consultantId: number,
    sourceAppId: number,
    targetAppId: number,
  ) {
    const targetCompanyId = await this.dataSource.transaction(async (manager) => {
      const targetApplication = await manager.query(
        'SELECT consultant_company_id FROM applications WHERE id = $1 LIMIT 1',
        [targetAppId],
      );

      const companyId = resolveDefaultCompanyId(
        targetAppId,
        targetApplication?.[0]?.consultant_company_id,
      );

      const existingTargetConsultant = await manager.query(
        'SELECT id FROM consultants WHERE email = (SELECT email FROM consultants WHERE id = $1) AND app_id = $2 AND id <> $1 LIMIT 1',
        [consultantId, targetAppId],
      );

      if (existingTargetConsultant.length > 0) {
        throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.INVALID_RECORD);
      }

      await manager.query(
        `
          UPDATE products
          SET application_id = $3,
              updated_at = NOW()
          WHERE application_id = $2
            AND (
              consultant_id = $1
              OR customer_id IN (
                SELECT id
                FROM customers
                WHERE consultant_id = $1
              )
            )
        `,
        [consultantId, sourceAppId, targetAppId],
      );

      await manager.query(
        `
          UPDATE customer_applications
          SET application_id = $3,
              updated_at = NOW()
          WHERE application_id = $2
            AND customer_id IN (
              SELECT id
              FROM customers
              WHERE consultant_id = $1
            )
        `,
        [consultantId, sourceAppId, targetAppId],
      );

      await manager.query(
        `
          UPDATE customer_log
          SET app_id = $3,
              updated_at = NOW()
          WHERE consultant_id = $1
            AND app_id = $2
        `,
        [consultantId, sourceAppId, targetAppId],
      );

      await manager.query(
        `
          UPDATE web_result_management
          SET app_id = $3
          WHERE consultant_id = $1
            AND app_id = $2
        `,
        [consultantId, sourceAppId, targetAppId],
      );

      await manager.query(
        `
          UPDATE customers
          SET app_id = $3,
              updated_at = NOW()
          WHERE consultant_id = $1
            AND app_id = $2
        `,
        [consultantId, sourceAppId, targetAppId],
      );

      const updatedConsultant = await manager.query(
        `
          UPDATE consultants
          SET app_id = $2,
              consultant_company_id = $3,
              updated_at = NOW()
          WHERE id = $1
            AND app_id = $4
          RETURNING id
        `,
        [consultantId, targetAppId, companyId, sourceAppId],
      );

      if (updatedConsultant.length === 0) {
        throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.INVALID_RECORD);
      }

      return companyId;
    });

    this.logger.log(
      `App sync consultant migrated: consultantId=${consultantId} sourceAppId=${sourceAppId} targetAppId=${targetAppId} consultantCompanyId=${targetCompanyId}`,
    );
  }

  private async deleteBrevoConsultantContacts(
    identifiers: Array<string | null | undefined>,
    reason: string,
  ) {
    const uniqueIdentifiers = Array.from(
      new Set(identifiers.filter((value): value is string => !!value)),
    );

    for (const identifier of uniqueIdentifiers) {
      try {
        await this.brevoService.deleteContact(identifier);
      } catch (error) {
        this.logger.warn(
          `[Brevo delete failed] reason=${reason} identifier=${identifier} ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }
  }

  private async syncBrevoConsultant(consultantId: number, previousEmail?: string | null) {
    const consultant = await this.findOneConsultant(consultantId);

    if (!consultant?.email) {
      return;
    }

    const shouldSyncBrevo = await this.hasBrevoSyncEligibleProduct(consultantId);
    if (!shouldSyncBrevo) {
      this.logger.log(
        `Brevo consultant sync skipped: consultantId=${consultantId} reason=no_eligible_product`,
      );
      await this.deleteBrevoConsultantContacts(
        [consultant.email, consultant.unconfirmed_email, previousEmail],
        'no_eligible_product',
      );
      return;
    }

    const application = consultant.app_id
      ? await this.applicationsService.findOneApplication(Number(consultant.app_id))
      : null;

    await this.brevoService.syncContact(
      {
        email: consultant.email,
        firstName: consultant.name,
        lastName: consultant.surname,
        phone: consultant.phone,
        phoneCountryCode: consultant.phone_country_code,
        application: consultant.app_id?.toString() ?? application?.id?.toString() ?? null,
        appId: consultant.app_id,
        country: consultant.country_details?.name ?? consultant.country_name ?? null,
        language: consultant.language,
        isMarketingConsent: this.resolveMarketingConsent(consultant),
      },
      previousEmail,
    );
  }

  async resyncBrevoConsultants(): Promise<BrevoConsultantResyncResult> {
    if (!this.brevoService.isEnabled()) {
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }

    const consultants = await this.ConsultantsRepository.query(`
      SELECT DISTINCT ON (LOWER(email))
        id::text AS id,
        email
      FROM consultants
      WHERE email IS NOT NULL
        AND email <> ''
      ORDER BY LOWER(email), updated_at DESC NULLS LAST, id DESC
    `);

    const result: BrevoConsultantResyncResult = {
      total: consultants.length,
      synced: 0,
      failed: 0,
      failures: [],
    };

    this.logger.log(`Starting Brevo consultant resync for ${consultants.length} consultants`);

    for (const consultant of consultants) {
      try {
        await this.syncBrevoConsultant(Number(consultant.id));
        result.synced += 1;
      } catch (error) {
        result.failed += 1;
        result.failures.push({
          consultantId: String(consultant.id),
          email: consultant.email,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.log(
      `Brevo consultant resync completed: total=${result.total} synced=${result.synced} failed=${result.failed}`,
    );

    return result;
  }

  private async normalizeConsultantResponse(
    consultant: any,
    options?: { accessToken?: string; refreshToken?: string; includeApplicationUrls?: boolean },
  ) {
    const normalizedConsultant = consultant;
    normalizedConsultant.products = normalizedConsultant.products ?? [];

    if (normalizedConsultant.country_details) {
      normalizedConsultant.country_details.phone_code =
        normalizedConsultant.country_details.phone_code ?? null;
      delete normalizedConsultant.country_details.createdAt;
      delete normalizedConsultant.country_details.updatedAt;
    }

    if (normalizedConsultant.consultant_shop) {
      normalizedConsultant.consultant_shop.country_name =
        normalizedConsultant.consultant_shop.getContryName;
      delete normalizedConsultant.consultant_shop.country;
      delete normalizedConsultant.consultant_shop.consultantBranchId;
      delete normalizedConsultant.consultant_shop.createdAt;
      delete normalizedConsultant.consultant_shop.updatedAt;
      delete normalizedConsultant.consultant_shop.address;
      delete normalizedConsultant.consultant_shop.city;
    }

    if (!normalizedConsultant.consultant_company && normalizedConsultant.consultant_company_id) {
      try {
        normalizedConsultant.consultant_company = await this.getCompanyDetails({
          consultant_company_id: normalizedConsultant.consultant_company_id ?? 1,
        });
      } catch (e) {
        this.logger.warn(`[company details patch failed] ${e instanceof Error ? e.message : e}`);
      }
    } else if (normalizedConsultant.consultant_company?.id) {
      normalizedConsultant.consultant_company = await this.getCompanyDetails({
        consultant_company_id: normalizedConsultant.consultant_company.id,
      });
    }

    for (const product of normalizedConsultant.products) {
      if (!product) {
        continue;
      }

      product.license_id = product.license?.id ?? product.license_id ?? null;

      const expiryMeta = this.licenseDomainService.resolveExpiryMeta({
        firstUseDate: product.first_use_date,
        licensePeriod: product.license_period,
        licenseName: product.license?.name,
        isAgent: normalizedConsultant.is_agent,
      });
      product.expired_date = expiryMeta.expiredDate;
      product.is_expired = expiryMeta.isExpired;

      if (options?.includeApplicationUrls && product.application?.id) {
        product.application = {
          ...product.application,
          ...(await this.getApplicatioUrls(product.application.id)),
        };
      }

      if (!product.device) {
        continue;
      }

      if (product.device.consultant_company?.id) {
        product.device.consultant_company = await this.getCompanyDetails({
          consultant_company_id: product.device.consultant_company.id,
        });
      } else if (product.device.consultant_company_id) {
        try {
          product.device.consultant_company = await this.getCompanyDetails({
            consultant_company_id: product.device.consultant_company_id,
          });
        } catch (e) {
          this.logger.warn(
            `[device company lookup failed] device_id=${product.device?.id}: ${
              e instanceof Error ? e.message : e
            }`,
          );
        }
      }

      if (product.device.consultant_company) {
        if (product.device.consultant_company_id === 1) {
          product.device.consultant_company.image_upload = normalizedConsultant.image_upload;
        }

        if (product.license?.name?.toLowerCase() === 'standard') {
          product.device.consultant_company.image_upload = false;
        }

        if (product.device.consultant_company.applications) {
          product.device.consultant_company.applications = [];
        }
      }
    }

    normalizedConsultant.products = this.changeExpiredlicense(
      normalizedConsultant.products,
      normalizedConsultant.is_agent,
    );

    if (normalizedConsultant.consultant_company?.applications) {
      normalizedConsultant.consultant_company.applications = [];
    }

    normalizedConsultant.gender = normalizedConsultant.gender?.id
      ? Number(normalizedConsultant.gender.id)
      : null;
    normalizedConsultant.country = normalizedConsultant.getContryName;
    normalizedConsultant.country_code = normalizedConsultant.getContryCode;
    normalizedConsultant.store = normalizedConsultant.getStoreName ?? null;
    try {
      normalizedConsultant.optic_number = normalizedConsultant.getOpticNumbers ?? [];
    } catch {
      normalizedConsultant.optic_number = [];
    }

    if (options?.accessToken) {
      normalizedConsultant.token = options.accessToken;
    }

    if (options?.refreshToken) {
      normalizedConsultant.refresh_token = options.refreshToken;
    }

    return orderResponseFields(normalizedConsultant, CONSULTANT_RESPONSE_FIELD_ORDER);
  }

  async bcryptHashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  public async sendAccountConfimationEmail(
    token: string,
    data: any,
    locale: string,
    _company: string | null,
  ) {
    const normalizedData = typeof data === 'string' ? { email: data } : data;
    const { name, service, consultant_company_id, email } = normalizedData;

    const mailerInfo = resolveEmailBrandConfig({
      consultantCompanyId: consultant_company_id,
      appName: service,
      fallbackKey: 'choicetech',
    });
    const { subject, templateContext } = this.mailTemplateService.buildEmailConfirmationTemplate({
      locale,
      brandConfig: mailerInfo,
      name,
      email,
      appName: service,
      confirmationLink: `${process.env.EMAIL_URL}/consultants/confirm?token=${encodeURIComponent(
        token,
      )}&locale=${locale ?? 'en'}`,
      defaultName: 'Consultant',
    });

    return this.mailDispatchService.sendBrandedEmail({
      to: email,
      subject,
      templateName: 'email-confirmation',
      templateContext,
      emailProvider: mailerInfo.emailProvider,
      appName: service,
    });
  }

  async verifyPasswordBcrypt(
    enteredPassword: string,
    bcryptHash: string,
    locale = 'en',
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(enteredPassword, bcryptHash);
    } catch (error) {
      this.logger.error('Error verifying password with bcrypt', error);
      throw ErrorExceptionFactory.createFromStatus(
        'internal',
        ErrorStatus.SERVER_ERROR,
        undefined,
        locale,
      );
    }
  }

  async verifyPasswordArgon2(
    enteredPassword: string,
    argon2Hash: string,
    locale = 'en',
  ): Promise<boolean> {
    try {
      return await argon2.verify(argon2Hash, enteredPassword);
    } catch (error) {
      this.logger.error('Error verifying password with argon2', error);
      throw ErrorExceptionFactory.createFromStatus(
        'internal',
        ErrorStatus.SERVER_ERROR,
        undefined,
        locale,
      );
    }
  }

  determineHashAlgorithm(storedHash: string): 'bcrypt' | 'argon2' {
    return storedHash.startsWith('$2') ? 'bcrypt' : 'argon2';
  }

  async verifyPassword(
    enteredPassword: string,
    storedHash: string,
    locale = 'en',
  ): Promise<boolean> {
    const hashAlgorithm = this.determineHashAlgorithm(storedHash);

    switch (hashAlgorithm) {
      case 'bcrypt':
        return this.verifyPasswordBcrypt(enteredPassword, storedHash, locale);
      case 'argon2':
        return this.verifyPasswordArgon2(enteredPassword, storedHash, locale);
      default:
        throw ErrorExceptionFactory.createFromStatus(
          'internal',
          ErrorStatus.SERVER_ERROR,
          undefined,
          locale,
        );
    }
  }

  async insertConsultant(newConsultant: Consultants) {
    const newCustomer = this.ConsultantsRepository.create(newConsultant);
    const result = await this.ConsultantsRepository.save(newCustomer);
    return result;
  }

  async updateConsultant(id: number, consultantInput: any) {
    const result = await this.ConsultantsRepository.update(id, consultantInput);
    await this.recordConsultantLog(
      {
        consultant_id: id,
        app_id: consultantInput?.app_id ?? null,
        email: consultantInput?.email ?? null,
        phone: consultantInput?.phone ?? null,
      },
      'consultant_update',
      'update',
    );
    return result;
  }

  async getConsultantLogs(consultantId: number, query: GetConsultantLogDto) {
    const page = query.page ? Math.max(Number(query.page) || 1, 1) : 1;
    const perPage = query.per ? Math.min(Math.max(Number(query.per) || 20, 1), 100) : 20;
    const skip = (page - 1) * perPage;

    const qb = this.consultantLogRepository.createQueryBuilder('log');
    qb.where('log.consultant_id = :consultantId', { consultantId });

    if (query.action_type) {
      qb.andWhere('log.action_type = :actionType', { actionType: query.action_type });
    }

    if (query.consultant_id) {
      qb.andWhere('log.consultant_id = :targetConsultantId', {
        targetConsultantId: Number(query.consultant_id),
      });
    }

    if (query.app_id) {
      qb.andWhere('log.app_id = :appId', { appId: Number(query.app_id) });
    }

    if (query.email) {
      qb.andWhere('LOWER(log.email) LIKE LOWER(:email)', { email: `%${query.email}%` });
    }

    if (query.phone) {
      qb.andWhere('LOWER(log.phone) LIKE LOWER(:phone)', { phone: `%${query.phone}%` });
    }

    if (query.reason) {
      qb.andWhere('LOWER(log.reason) LIKE LOWER(:reason)', { reason: `%${query.reason}%` });
    }

    if (query.created_from) {
      qb.andWhere('log.created_at >= :createdFrom', { createdFrom: new Date(query.created_from) });
    }

    if (query.created_to) {
      qb.andWhere('log.created_at <= :createdTo', { createdTo: new Date(query.created_to) });
    }

    qb.orderBy('log.created_at', 'DESC');
    qb.skip(skip).take(perPage);

    const [data, total_size] = await qb.getManyAndCount();

    return {
      data,
      total_size,
      current_page_size: data.length,
      current_page: page,
      total_pages: Math.ceil(total_size / perPage),
      perPage,
    };
  }

  async createConsultant(newUser: ConsultantDto, locale = 'en') {
    try {
      const user: any = {
        password_digest: await this.bcryptHashPassword(newUser.password),
        email: newUser.email,
        unconfirmed_email: newUser.email,
        app_id: Number(newUser.app_id),
        email_confirmed: !!newUser.email_confirmed,
        rememberCreatedAt: new Date(),
        updated_at: new Date(),
        created_at: new Date(),
        is_hair_skin: newUser?.is_hair_skin ?? false,
        is_agent: newUser?.is_agent ?? false,
        consultant_company_id: newUser.consultant_company_id ?? null,
      };

      const result: any = await this.insertConsultant(user);
      await this.recordConsultantLog(
        {
          consultant_id: result?.id,
          app_id: result?.app_id ?? newUser?.app_id ?? null,
          email: result?.email ?? newUser?.email ?? null,
          phone: result?.phone ?? null,
        },
        'consultant_create',
        'create',
      );
      return result;
    } catch (error: any) {
      if (error.code === String(ErrorStatus.DATA_ALREADY_EXIST)) {
        throw ErrorExceptionFactory.createFromStatus(
          'conflict',
          ErrorStatus.ACCOUNT_ALREADY_EXISTS,
          undefined,
          locale,
        );
      }

      throw ErrorExceptionFactory.createFromStatus(
        'internal',
        ErrorStatus.SERVER_ERROR,
        undefined,
        locale,
      );
    }
  }

  public async signUp(newUser: ConsultantDto, locale = 'en', company: string | null) {
    if (newUser.password.length < 6) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.BAD_REQUEST,
        undefined,
        locale,
      );
    }

    const existing = await this.findConsultant(Number(newUser.app_id), newUser.email);
    if (existing) {
      throw ErrorExceptionFactory.createFromStatus(
        'conflict',
        ErrorStatus.ACCOUNT_ALREADY_EXISTS,
        undefined,
        locale,
      );
    }

    const QA_EMAIL_RULES = [
      '@example.com',
      '@example.test',
      'qa@example.com',
      'qa@example.test',
    ];

    if (QA_EMAIL_RULES.some((rule) => newUser.email.includes(rule))) {
      newUser.email_confirmed = true;
    }

    newUser.is_hair_skin = newUser.is_hair_skin === true;
    newUser.is_agent = (await this.AdminUsers.doesAgentExistByEmail(newUser.email)) ?? false;

    const application = await this.applicationsService.findOneApplication(Number(newUser.app_id));

    if (!newUser.consultant_company_id) {
      newUser.consultant_company_id = resolveDefaultCompanyId(
        Number(newUser.app_id),
        application?.consultant_company_id,
      );
    }

    const consultant = await this.createConsultant(newUser, locale);

    if (newUser.is_hair_skin && [44, 53, 137, 138].includes(Number(newUser.app_id))) {
      const APP_SWITCH: Record<number, number> = {
        44: 53,
        53: 44,
        137: 138,
        138: 137,
      };

      const targetAppId = APP_SWITCH[Number(newUser.app_id)];
      const exists = await this.findConsultant(targetAppId, newUser.email);

      if (!exists) {
        const otherUser = { ...newUser, app_id: targetAppId };

        if (!otherUser.consultant_company_id) {
          const targetApp = await this.applicationsService.findOneApplication(targetAppId);

          otherUser.consultant_company_id = resolveDefaultCompanyId(
            targetAppId,
            targetApp?.consultant_company_id,
          );
        }

        await this.createConsultant(otherUser, locale);
      }
    }

    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'phone_country_code',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'zip_code',
      'state',
      'note',
      'push_token',
      'memo',
      'app_id',
      'company_name',
      'company_address',
      'branch',
      'position',
      'skin_color_group_id',
      'ethnicity_id',
      'callback_url',
      'code',
      'country_id',
      'token',
      'social',
      'email_subscription',
    ];
    const includes = ['country_details', 'gender', 'consultant_shop'];

    const [confirmationToken, tokens, consultantData] = await Promise.all([
      this.jwtService.generateToken(
        {
          id: consultant.id,
          email: consultant.email,
          app_id: consultant.app_id,
          is_hair_skin: newUser.is_hair_skin,
          role: Role.Consultant,
        },
        TokenTypeEnum.CONFIRMATION,
        consultant.domain,
      ),
      this.authService.generateAuthTokens(
        {
          id: consultant.id,
          email: consultant.email,
          is_hair_skin: newUser.is_hair_skin,
          app_id: consultant.app_id,
          role: Role.Consultant,
        },
        '',
      ),
      this.getConsultant({ id: consultant.id }, selections, includes),
    ]);

    const [accessToken, refreshToken] = tokens;

    try {
      await this.sendAccountConfimationEmail(
        confirmationToken,
        {
          email: newUser.email,
          name: consultantData.name,
          service: application.name,
          consultant_company_id: consultant.consultant_company_id,
        },
        locale,
        company,
      );
    } catch (e) {}

    try {
      await this.updateConsultant(consultantData.id, {
        confirm_token: confirmationToken,
        token: refreshToken,
        confirmation_sent_at: new Date(),
      });
    } catch (e) {
      this.logger.warn(`[Token DB update failed] ${e instanceof Error ? e.message : e}`);
    }

    return this.normalizeConsultantResponse(consultantData, {
      accessToken,
      refreshToken,
    });
  }

  async checkConsultantPosition(id: number) {
    const position = await this.position.findOne({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
      },
    });
    return position;
  }

  async getConsultant(conditions: any, selections?: any, includes?: string[]) {
    const consultant: any = await this.ConsultantsRepository.findOne({
      where: conditions,
      select: selections
        ? Array.isArray(selections)
          ? (selections as FindOptionsSelectByString<Consultants>)
          : selections
        : ['id', 'email', 'app_id', 'name', 'is_hair_skin', 'is_agent', 'consultant_shop_id'],
      relations: includes ? includes : [],
    });

    return consultant;
  }

  async fetchConsultants(
    conditions?: any,
    selections?: string[],
    includes?: string[],
    addFields?: string[],
  ) {
    const consultants: any[] = await this.ConsultantsRepository.find({
      where: conditions ? conditions : {},
      select: selections
        ? (selections as FindOptionsSelectByString<Consultants>)
        : ['id', 'email', 'app_id', 'name'],
      relations: includes ? includes : [],
    });

    if (addFields) {
      consultants.forEach((consultant) => {
        addFields.forEach((field) => {
          if (field === 'country_code') {
            consultant.country_code = consultant.getContryCode;
          }

          if (field === 'optic_number') {
            consultant.optic_number = consultant.getOpticNumbers;
          }
        });
      });
    }
    return consultants;
  }

  async findConsultant(app_id: number, email: string) {
    const consultant = await this.ConsultantsRepository.findOne({
      where: { app_id: app_id, email },
      relations: [
        'consultant_shop',
        'consultant_shop.country',
        'country_details',
        'gender',
        'consultant_company',
        'consultant_position',
      ],
    });

    return consultant;
  }

  async findNotifications(
    conditions: any,
    selections?: string[],
    includes?: string[],
    search?: string,
    page?: number,
    perPage?: number,
  ) {
    if (!page) page = 1;
    if (!perPage) perPage = 10;
    const skip = (page - 1) * perPage;

    if (search) {
      conditions = {
        ...conditions,
        title: ILike(`%${search}%`),
      };
    }

    const [result, total] = await this.notificationRepository.findAndCount({
      where: conditions,
      select: selections
        ? (selections as FindOptionsSelect<Notifications>)
        : ['id', 'target_type', 'target_id', 'title'],
      relations: includes ? includes : [],
      take: perPage,
      skip: skip,
      order: { created_at: 'DESC' },
    });
    const totalPages = Math.ceil(total / perPage);

    return {
      data: result,
      total_size: total,
      current_page_size: totalPages,
      current_page: page,
      total_pages: totalPages,
    };
  }

  async checkConsultant(app_id: number, email: string, locale = 'en') {
    let consultant: any;

    try {
      consultant = await this.findConsultant(Number(app_id), email);
    } catch (e) {
      this.logger.warn(`[findConsultant] ${e instanceof Error ? e.message : e}`);
    }

    const appSyncTargetMap: Record<number, number> = {
      44: 137,
      52: 138,
      120: 140,
      121: 139,
    };
    const appSyncSourceMap = Object.entries(appSyncTargetMap).reduce<Record<number, number>>(
      (acc, [sourceAppId, targetAppId]) => {
        acc[Number(targetAppId)] = Number(sourceAppId);
        return acc;
      },
      {},
    );

    const targetAppId = appSyncTargetMap[app_id];
    const sourceAppId = appSyncSourceMap[app_id];

    if (targetAppId) {
      try {
        const sourceConsultant = consultant
          ? await this.ConsultantsRepository.findOne({
              where: {
                email,
                app_id,
              },
              relations: [
                'consultant_company',
                'country_details',
                'products',
                'products.device',
                'products.license',
                'products.application',
              ],
            })
          : null;

        const hasSyncProduct =
          sourceConsultant?.is_app_sync === true ||
          sourceConsultant?.products?.some((p: any) => p.is_app_sync === true);

        if (sourceConsultant && hasSyncProduct) {
          await this.migrateAppSyncConsultant(sourceConsultant.id, app_id, targetAppId);

          consultant = await this.ConsultantsRepository.findOne({
            where: {
              email,
              app_id: targetAppId,
            },
            relations: [
              'consultant_company',
              'country_details',
              'products',
              'products.device',
              'products.license',
              'products.application',
            ],
          });
        } else if (!consultant) {
          const targetConsultant = await this.ConsultantsRepository.findOne({
            where: {
              email,
              app_id: targetAppId,
            },
            relations: [
              'consultant_company',
              'country_details',
              'products',
              'products.device',
              'products.license',
              'products.application',
            ],
          });

          const targetHasSyncProduct =
            targetConsultant?.is_app_sync === true ||
            targetConsultant?.products?.some((p: any) => p.is_app_sync === true);

          if (targetHasSyncProduct) {
            consultant = targetConsultant;
          }
        }
      } catch (e) {
        if (e instanceof ConflictException) {
          throw e;
        }

        this.logger.warn(`[app sync lookup failed] ${e instanceof Error ? e.message : e}`);
      }
    } else if (sourceAppId) {
      try {
        const sourceConsultant = consultant
          ? null
          : await this.ConsultantsRepository.findOne({
              where: {
                email,
                app_id: sourceAppId,
              },
              relations: [
                'consultant_company',
                'country_details',
                'products',
                'products.device',
                'products.license',
                'products.application',
              ],
            });

        const hasSyncProduct =
          sourceConsultant?.is_app_sync === true ||
          sourceConsultant?.products?.some((p: any) => p.is_app_sync === true);

        if (sourceConsultant && hasSyncProduct) {
          await this.migrateAppSyncConsultant(sourceConsultant.id, sourceAppId, app_id);

          consultant = await this.ConsultantsRepository.findOne({
            where: {
              email,
              app_id,
            },
            relations: [
              'consultant_company',
              'country_details',
              'products',
              'products.device',
              'products.license',
              'products.application',
            ],
          });
        }
      } catch (e) {
        if (e instanceof ConflictException) {
          throw e;
        }

        this.logger.warn(`[app sync lookup failed] ${e instanceof Error ? e.message : e}`);
      }
    }

    if (!consultant) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.LOGIN_FAILED,
        undefined,
        locale,
      );
    }

    try {
      await this.companies.getCompaniesFiles(consultant?.consultant_company_id ?? '1');
    } catch (e) {
      this.logger.warn(`[company files load failed] ${e instanceof Error ? e.message : e}`);
    }

    try {
      if (consultant?.consultant_company) {
        consultant.consultant_company = await this.getCompanyDetails({
          consultant_company_id: consultant.consultant_company.id,
        });
      }
    } catch (e) {
      this.logger.warn(`[company details load failed] ${e instanceof Error ? e.message : e}`);
    }

    try {
      if (consultant?.country_details) {
        consultant.country_id = consultant.country_details?.id ?? '';
        consultant.country = consultant.country_details?.name ?? '';
        consultant.country_code = consultant.country_details?.countryCode ?? '';
      }
    } catch (e) {
      this.logger.warn(`[country details processing failed] ${e instanceof Error ? e.message : e}`);
    }

    try {
      if (consultant?.consultant_position_id) {
        consultant.consultant_position = await this.checkConsultantPosition(
          consultant.consultant_position_id,
        );
      }
    } catch (e) {
      this.logger.warn(
        `[position details processing failed] ${e instanceof Error ? e.message : e}`,
      );
    }

    let products: any[] = [];

    try {
      products = await this.devices.getCompaniesFiles(
        consultant?.id ?? null,
        Number(consultant?.app_id ?? app_id),
      );
    } catch (e) {
      this.logger.warn(`[products load failed] ${e instanceof Error ? e.message : e}`);
    }

    const promises: Promise<any>[] = [];
    products.forEach((p) => {
      if (p.device?.consultant_company_id) {
        promises.push(
          this.getCompanyDetails({
            consultant_company_id: String(p.device.consultant_company_id),
          }),
        );
      }
    });

    let result = [];
    try {
      result = await Promise.all(promises);
    } catch (e) {
      this.logger.warn(`[company merge failed] ${e instanceof Error ? e.message : e}`);
    }

    const optic_number: string[] = [];

    for (const p of products) {
      try {
        if (!p.device) {
          this.logger.warn(`[device missing] product_id=${p.id}`);
          continue;
        }

        const companyDetails = result.find((r) => r.id === (p.device?.consultant_company_id ?? 1));

        p.device.consultant_company = companyDetails;

        const expiryMeta = this.licenseDomainService.resolveExpiryMeta({
          firstUseDate: p.first_use_date,
          licensePeriod: p.license_period,
          licenseName: p.license?.name,
          isAgent: consultant.is_agent,
        });
        p.expired_date = expiryMeta.expiredDate;
        p.is_expired = expiryMeta.isExpired;

        const files = await this.companies.getCompaniesFiles(String(p.application?.id));
        const attachmentObject: any = {};

        files.forEach((attachment) => {
          const { name, blob } = attachment;
          const key = blob?.key;
          if (!key) {
            return;
          }

          attachmentObject[name] = `${process.env.URL}/v1/api/image/${key}`;
        });

        if (p.application) {
          p.application.apk_url = attachmentObject.apk;
          p.application.old_apk_url = attachmentObject.old_apk;
          p.application.app_icon = attachmentObject.icon;
        }

        p.device.offline_qo = p.device.offline_qo;

        if (p.device.optic_number) {
          optic_number.push(p.device.optic_number);
        }
      } catch (e) {
        this.logger.warn(`[product processing failed] ${e instanceof Error ? e.message : e}`);
      }
    }

    consultant.optic_number = optic_number;
    consultant.products = products;

    return consultant;
  }

  async validateUser(email: string, app_id: number, password: string, locale = 'en') {
    const user = await this.checkConsultant(Number(app_id), email, locale);

    const isPasswordValid = await this.verifyPassword(
      password,
      user?.password_digest ?? null,
      locale,
    );

    if (!isPasswordValid) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.LOGIN_FAILED,
        undefined,
        locale,
      );
    }

    const products = await this.productsRepository.find({
      where: { consultant_id: user.id },
      relations: ['application', 'device', 'license'],
    });

    user.products = products;
    return user;
  }

  async validateUserSocial(email: string, app_id: number, social_id: string) {
    const user = await this.checkConsultant(Number(app_id), email);

    const confirmUser = await this.ConsultantsRepository.findOne({
      where: {
        email,
        app_id,
      },
    });

    if (confirmUser) {
      this.updateConsultant(confirmUser.id, {
        social_id,
        email_confirmed: true,
      });
      return user;
    } else {
      const userConfirm: any = {
        email: email,
        app_id: app_id,
        email_confirmed: true,
        rememberCreatedAt: new Date(),
        updated_at: new Date(),
        created_at: new Date(),
      };
      const result: any = await this.insertConsultant(userConfirm);
      return result;
    }
  }

  async updatConsultantData(id: number, refreshToken: string, confirmToken: string) {
    try {
      await this.ConsultantsRepository.createQueryBuilder()
        .update(Consultants)
        .set({
          token: refreshToken,
          confirm_token: confirmToken,
          first_login_date: () => 'COALESCE(first_login_date, NOW())',

          last_login_date: new Date(),
        })
        .where('id = :id', { id })
        .execute();
    } catch (e) {
      this.logger.error(`[updatConsultantData failed] ${e instanceof Error ? e.message : e}`);

      if (e instanceof HttpException) {
        throw e;
      }

      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }

  rateLimitAndTimeCheckForAgent(first_login_date: any, login_rate_limit: number) {
    if (first_login_date == null) {
      return true;
    }
    const daysSinceFirstLogin = Math.floor(
      (Date.now() - first_login_date.getTime()) / (1000 * 60 * 60 * 24),
    );
    const loginRateLimit = login_rate_limit;

    if (daysSinceFirstLogin > 14 && loginRateLimit === 0) {
      throw ErrorExceptionFactory.createFromStatus('forbidden', ErrorStatus.PERMISSION_DENIED);
    }

    if (daysSinceFirstLogin > 14 && loginRateLimit >= 3) {
      throw ErrorExceptionFactory.createFromStatus('forbidden', ErrorStatus.PERMISSION_DENIED);
    }

    return true;
  }

  async login(data: ConsultantDto, locale = 'en') {
    const { app_id, password, email } = data;

    let consultant;
    try {
      consultant = await this.validateUser(email, Number(app_id), password, locale);
    } catch (err) {
      this.monitoringService.recordAuthLogin('failure', 'standard');
      throw ErrorExceptionFactory.createFromStatus(
        'unauthorized',
        ErrorStatus.LOGIN_FAILED,
        undefined,
        locale,
      );
    }

    try {
      if (consultant.consultant_company_id === null) {
        consultant.consultant_company_id = 1;
        await this.updateConsultant(consultant.id, {
          consultant_company_id: 1,
        });
      }

      if (!consultant.email_confirmed) {
        throw ErrorExceptionFactory.createFromStatus(
          'badRequest',
          ErrorStatus.EMAIL_NOT_CONFIRMED,
          undefined,
          locale,
        );
      }

      if (consultant.is_agent === true) {
        this.rateLimitAndTimeCheckForAgent(
          consultant.first_login_date,
          consultant.login_rate_limit,
        );
      }

      const [accessToken, refreshToken] = await this.authService.generateAuthTokens(
        {
          id: consultant.id,
          email: consultant.email,
          is_hair_skin: consultant.is_hair_skin,
          app_id: consultant.app_id,
          role: Role.Consultant,
        },
        '',
      );

      delete consultant.password_digest;
      delete consultant.recovery_password_digest;
      delete consultant.email_confirmed;

      await this.updatConsultantData(consultant.id, refreshToken, consultant.confirm_token);
      this.monitoringService.recordAuthLogin('success', 'standard');
      return this.normalizeConsultantResponse(consultant, {
        accessToken,
        refreshToken,
      });
    } catch (e) {
      this.logger.error(`[login flow failed] ${e instanceof Error ? e.message : e}`);

      if (e instanceof HttpException) throw e;

      throw ErrorExceptionFactory.createFromStatus(
        'internal',
        ErrorStatus.SERVER_ERROR,
        undefined,
        locale,
      );
    }
  }

  async updateAgentProduct(id: number) {
    const consultant = await this.getConsultant({
      id,
    });

    if (consultant.is_agent) {
      const product = await this.productsService.findOneProduct({
        consultant_id: consultant.id,
        application_id: consultant.app_id,
      });

      if (product !== null) {
        await this.productsService.updateProduct(product.id, {
          consultant_id: null,
          first_use_date: null,
        });
      }
    }

    return true;
  }

  async logout(id: number): Promise<IMessage> {
    await this.updateConsultant(id, {
      token: null,
    });

    return this.commonService.generateMessage('success');
  }

  public async findOneConsultant(id: number) {
    const consultant = await this.ConsultantsRepository.findOne({
      where: { id },
      relations: ['consultant_company', 'country_details', 'gender', 'consultant_position'],
    });

    return consultant;
  }

  public async getConsultants(data: GetConsultantDto) {
    const { company_ids = [], shop_ids = [], position_ids = [], country_ids = [] } = data;

    const selections = [
      'id',
      'email',
      'token',
      'app_id',
      'name',
      'surname',
      'phone_country_code',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'zip_code',
      'state',
      'note',
      'push_token',
      'memo',
      'company_name',
      'company_address',
      'branch',
      'position',
      'skin_color_group_id',
      'ethnicity_id',
      'callback_url',
      'code',
      'social',
      'country_id',
      'email_subscription',
    ];

    const includes = [
      'country_details',
      'gender',
      'consultant_shop',
      'consultant_company',
      'consultant_position',
      'products',
      'products.device',
    ];

    const addFeilds = ['country_code', 'optic_number'];

    const conditions: any = {};

    if (company_ids.length) conditions['consultant_company_id'] = In(company_ids);
    if (shop_ids.length) conditions['consultant_shop_id'] = In(shop_ids);
    if (position_ids.length) conditions['consultant_position_id'] = In(position_ids);
    if (country_ids.length) conditions['country_id'] = In(country_ids);

    const consultants = await this.fetchConsultants(conditions, selections, includes, addFeilds);
    const promises: Promise<any>[] = [];

    consultants.map((c) => {
      if (c.consultant_company?.id) {
        promises.push(this.getCompanyDetails({ consultant_company_id: c.consultant_company.id }));
      }
      c['country'] = c.country_details;
      c['store'] = c.consultant_shop;
      c['refresh_token'] = c.token;
      c['token'] = null;

      delete c.country_details;
      delete c.consultant_shop;

      return c;
    });

    const result = await Promise.all(promises);

    const modifiedConsultants = consultants.map((consultant) => {
      const companyDetails = result.find((r) => r.id == consultant.consultant_company?.id);
      consultant['consultant_company'] = companyDetails;
      return consultant;
    });

    return modifiedConsultants;
  }

  public async modifyConsultant(
    userId: number,
    data: UpdateConsultantDto,
    _locale = 'en',
    _company: string | null,
  ) {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'phone_country_code',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'zip_code',
      'state',
      'note',
      'push_token',
      'memo',
      'app_id',
      'company_name',
      'company_address',
      'branch',
      'position',
      'skin_color_group_id',
      'ethnicity_id',
      'callback_url',
      'code',
      'country_id',
      'token',
      'social',
      'is_agent',
      'is_hair_skin',
      'consultant_company_id',
      'email_subscription',
    ];

    const includes = [
      'country_details',
      'gender',
      'consultant_shop',
      'consultant_position',
      'consultant_company',
      'products',
      'products.license',
      'products.application',
      'products.device',
      'products.device.consultant_company',
      'consultant_shop.country',
    ];

    const consultant = await this.getConsultant({ id: userId }, selections, includes);

    if (!consultant) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.RECORD_NOT_FOUND);
    }

    const rawShopId = data.consultant_shop_id;
    delete data.consultant_shop_id;

    const normalizedShopId =
      rawShopId !== undefined && rawShopId !== null && String(rawShopId).trim() !== ''
        ? Number(rawShopId) > 0
          ? Number(rawShopId)
          : null
        : undefined;

    if (!data.birthdate) {
      delete data.birthdate;
    }

    const countryCodeInput =
      typeof data.country_code === 'string'
        ? data.country_code.trim()
        : typeof data.country === 'string'
        ? data.country.trim()
        : '';

    let resolvedCountryId: number | undefined =
      data.country_id !== undefined &&
      data.country_id !== null &&
      String(data.country_id).trim() !== ''
        ? Number(data.country_id)
        : undefined;
    let resolvedCountryName: string | undefined =
      data.country_name !== undefined ? data.country_name : undefined;

    if (countryCodeInput) {
      const countries = await this.countriesService.findCountry(
        { country_code: countryCodeInput.toUpperCase() },
        ['id', 'name', 'country_code'],
      );
      const country = countries[0];

      if (!country) {
        throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
      }

      resolvedCountryId = Number(country.id);
      resolvedCountryName = country.name;
    }

    data.app_id = data?.app_id ?? consultant.app_id;

    const targetAppId = Number(data.app_id);
    const targetEmail = data.email ?? consultant.email;

    await this.applicationsService.findOneApplication(targetAppId);

    if (targetEmail) {
      const existingConsultant = await this.findConsultant(targetAppId, targetEmail);

      if (existingConsultant && Number(existingConsultant.id) !== Number(userId)) {
        throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.INVALID_RECORD);
      }
    }

    const promises: Promise<any>[] = [];

    if (normalizedShopId !== undefined && normalizedShopId !== null) {
      promises.push(this.consultantShopsService.findOneConsultantShops(normalizedShopId));
    }

    if (data.gender_id) {
      promises.push(this.genderService.findOneGender(String(data.gender_id)));
    }

    if (data.skin_color_group_id) {
      promises.push(this.skinColorGroupService.findOneskinColorGroups(data.skin_color_group_id));
    }

    if (data.ethnicity_id) {
      promises.push(this.ethinicityService.findOneEthinicities(data.ethnicity_id));
    }

    await Promise.all(promises);

    const updatePayload: any = {
      updated_at: new Date(),
    };

    const assignIfDefined = (key: string, value: any) => {
      if (value !== undefined) {
        updatePayload[key] = value;
      }
    };

    assignIfDefined('email', data.email);
    assignIfDefined('phone', data.phone);
    assignIfDefined('name', data.name);
    assignIfDefined('surname', data.surname);
    assignIfDefined('os', data.os);
    assignIfDefined('language', data.language);
    assignIfDefined('app_id', data.app_id !== undefined ? targetAppId : undefined);
    assignIfDefined('phone_country_code', data.phone_country_code);
    assignIfDefined('address', data.address);
    assignIfDefined('city', data.city);
    assignIfDefined('state', data.state);
    assignIfDefined('zip_code', data.zip_code);
    assignIfDefined(
      'skin_color_group_id',
      data.skin_color_group_id !== undefined ? Number(data.skin_color_group_id) : undefined,
    );
    assignIfDefined(
      'ethnicity_id',
      data.ethnicity_id !== undefined ? Number(data.ethnicity_id) : undefined,
    );
    assignIfDefined('push_token', data.push_token);
    assignIfDefined('memo', data.memo);
    assignIfDefined('company_name', data.company_name);
    assignIfDefined('company_address', data.company_address);
    assignIfDefined('branch', data.branch);
    assignIfDefined('position', data.position);
    assignIfDefined('callback_url', data.callback_url);
    assignIfDefined('code', data.code);
    assignIfDefined('is_agent', data.is_agent);
    assignIfDefined(
      'consultant_company_id',
      data.consultant_company_id !== undefined ? Number(data.consultant_company_id) : undefined,
    );
    assignIfDefined('country_id', resolvedCountryId);
    assignIfDefined('country_name', resolvedCountryName);
    assignIfDefined('birthdate', data.birthdate);

    if (data.new_password !== undefined && data.new_password !== '') {
      updatePayload.password_digest = await this.bcryptHashPassword(data.new_password);
    }

    if (normalizedShopId !== undefined) {
      updatePayload.consultant_shop_id = normalizedShopId;
    }

    try {
      await this.ConsultantsRepository.update(userId, updatePayload);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.INVALID_RECORD);
      }

      throw error;
    }

    const updatedConsultant: any = await this.getConsultant({ id: userId }, selections, includes);

    delete updatedConsultant.password_digest;
    delete updatedConsultant.recovery_password_digest;
    delete updatedConsultant.status;

    const refreshToken = updatedConsultant.token;
    updatedConsultant.token = await this.jwtService.generateToken(
      {
        id: updatedConsultant.id,
        email: updatedConsultant.email,
        is_hair_skin: updatedConsultant.is_hair_skin,
        app_id: updatedConsultant.app_id,
        role: Role.Consultant,
      },
      TokenTypeEnum.ACCESS,
      '',
    );
    updatedConsultant.refresh_token = refreshToken;

    return this.normalizeConsultantResponse(updatedConsultant, {
      accessToken: updatedConsultant.token,
      refreshToken,
    });
  }

  public async confirmation(token: string) {
    const consultant = await this.getConsultant({
      confirm_token: token,
    });

    if (!consultant) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }

    const appIdMap: Record<number, number> = {
      44: 53,
      53: 44,
      137: 138,
      138: 137,
    };

    if (consultant.is_hair_skin) {
      const appId = consultant.app_id as number;
      const targetAppId = appIdMap[appId];

      if (!targetAppId) {
        this.logger.warn(`No mapping found for app_id=${appId}`);
        return;
      }

      const otherConsultant = await this.getConsultant({
        email: consultant.email,
        app_id: targetAppId,
      });

      if (otherConsultant) {
        await this.updateConsultant(otherConsultant.id, {
          email_confirmed: true,
          confirmed_at: new Date(),
        });
      }
    }

    await this.updateConsultant(consultant.id, {
      email_confirmed: true,
      confirmed_at: new Date(),
    });

    return this.commonService.generateMessage('Email confirmed successfully');
  }

  public async resendConfirmation(
    data: ResendConfirmationDto,
    locale = 'en',
    company: string | null,
  ) {
    const { email, app_id } = data;

    const [customer, application] = await Promise.all([
      this.getConsultant({ email, app_id }, [
        'id',
        'email',
        'confirm_token',
        'email_confirmed',
        'name',
        'consultant_company_id',
      ]),
      this.applicationsService.findOneApplication(Number(app_id)),
    ]);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    if (customer.email_confirmed) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    await Promise.all([
      this.sendAccountConfimationEmail(
        customer.confirm_token,
        {
          email: customer.email,
          name: customer.name,
          service: application.name,
          consultant_company_id: customer.consultant_company_id,
          app_id,
        },
        locale,
        company,
      ),
      this.updateConsultant(customer.id, {
        confirmation_sent_at: new Date(),
      }),
    ]);

    return this.commonService.generateMessage('Success!');
  }

  public async changeEmail(
    consultantId: number,
    data: ChangeEmailDto,
    locale = 'en',
    company: string | null,
  ) {
    const consultant = await this.getConsultant({ id: consultantId });

    if (!consultant) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.RECORD_NOT_FOUND);
    }

    const application = await this.applicationsService.findOneApplication(consultant.app_id);

    const confirmationToken = await this.jwtService.generateToken(
      { id: consultant.id, email: consultant.email, role: Role.Consultant },
      TokenTypeEnum.CONFIRMATION,
      '',
    );

    await Promise.all([
      this.sendAccountConfimationEmail(
        confirmationToken,
        {
          email: data.email,
          name: consultant.name,
          service: application.name,
          consultant_company_id:
            consultant.consultant_company_id ?? application?.consultant_company_id,
          app_id: consultant.app_id,
        },
        locale,
        company,
      ),
      this.sendAccountConfimationEmail(
        confirmationToken,
        {
          email: consultant.email,
          name: consultant.name,
          service: application.name,
          consultant_company_id:
            consultant.consultant_company_id ?? application?.consultant_company_id,
          app_id: consultant.app_id,
        },
        locale,
        company,
      ),
      this.updateConsultant(consultantId, {
        unconfirmed_email: data.email,
        confirm_token: confirmationToken,
        email_confirmed: false,
        confirmation_sent_at: new Date(),
      }),
    ]);

    return this.commonService.generateMessage('Success!');
  }

  public async confirmEmail(data: ConfirmHtmlDto, locale = 'en') {
    const { token } = data;

    let consultant: any;

    try {
      consultant = await this.getConsultant({ confirm_token: token }).catch((e: any): null => {
        this.logger.warn(
          `[confirmEmail] getConsultant lookup failed: ${e instanceof Error ? e.message : e}`,
        );
        return null;
      });
    } catch (e) {
      this.logger.warn(`[confirmEmail] ${e instanceof Error ? e.message : e}`);
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }

    if (!consultant) {
      this.logger.warn('[confirmEmail] consultant not found');

      return this.templateRenderService.renderTemplate(
        'templates',
        'confirm',
        this.templateRenderService.buildConfirmPageContext(locale, false),
      );
    }

    if (consultant.email_confirmed) {
      return this.templateRenderService.renderTemplate(
        'templates',
        'confirm',
        this.templateRenderService.buildConfirmPageContext(locale, true),
      );
    }

    if (consultant.is_hair_skin === true) {
      const appIdMapping: Record<number, number> = {
        44: 53,
        53: 44,
        137: 138,
        138: 137,
      };

      const mappedAppId = appIdMapping[consultant.app_id];

      if (mappedAppId) {
        const consultant2 = await this.getConsultant({
          email: consultant.email,
          app_id: mappedAppId,
        }).catch((e: any): null => {
          this.logger.warn(
            `[confirmEmail] related app consultant lookup failed: ${
              e instanceof Error ? e.message : e
            }`,
          );
          return null;
        });

        if (consultant2) {
          await this.updateConsultant(consultant2.id, {
            email: consultant.unconfirmed_email,
            unconfirmed_email: null,
            email_confirmed: true,
            confirmed_at: new Date(),
            confirm_token: null,
            token: null,
          });
        }
      } else {
        this.logger.warn(`[confirmEmail] unmapped app_id for hair/skin sync: ${consultant.app_id}`);
      }
    }

    await this.updateConsultant(consultant.id, {
      email: consultant.unconfirmed_email,
      unconfirmed_email: null,
      email_confirmed: true,
      confirmed_at: new Date(),
      confirm_token: null,
      token: null,
    });

    return this.templateRenderService.renderTemplate(
      'templates',
      'confirm',
      this.templateRenderService.buildConfirmPageContext(locale, true),
    );
  }

  public async confirmEmailById(token: string, locale = 'en') {
    const consultant = await this.getConsultant({ confirm_token: token });

    if (!consultant) {
      return this.templateRenderService.renderTemplate(
        'templates',
        'confirm',
        this.templateRenderService.buildConfirmPageContext(locale, false),
      );
    }

    if (consultant.email_confirmed) {
      return this.templateRenderService.renderTemplate(
        'templates',
        'confirm',
        this.templateRenderService.buildConfirmPageContext(locale, true),
      );
    }

    return this.templateRenderService.renderTemplate(
      'templates',
      'confirm',
      this.templateRenderService.buildConfirmPageContext(locale, false),
    );
  }

  public async getMe(userId: number) {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'phone_country_code',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'zip_code',
      'state',
      'note',
      'push_token',
      'memo',
      'app_id',
      'company_name',
      'company_address',
      'branch',
      'position',
      'skin_color_group_id',
      'ethnicity_id',
      'callback_url',
      'code',
      'country_id',
      'token',
      'social',
      'is_agent',
      'is_hair_skin',
      'image_upload',
    ];

    const includes = [
      'country_details',
      'gender',
      'consultant_shop',
      'consultant_position',
      'consultant_company',
      'products',
      'products.license',
      'products.application',
      'products.device',
      'products.device.consultant_company',
      'consultant_shop.country',
    ];

    const consultant = await this.getConsultant({ id: userId }, selections, includes);

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const refreshToken = consultant.token;
    consultant.token = await this.jwtService.generateToken(
      {
        id: consultant.id,
        email: consultant.email,
        is_hair_skin: consultant.is_hair_skin,
        app_id: consultant.app_id,
        role: Role.Consultant,
      },
      TokenTypeEnum.ACCESS,
      '',
    );
    consultant.refresh_token = refreshToken;
    return this.normalizeConsultantResponse(consultant, {
      accessToken: consultant.token,
      refreshToken,
      includeApplicationUrls: true,
    });
  }

  public async crmsync(userId: number) {
    const consultant = await this.getConsultant(
      { id: userId },
      ['id', 'app_id', 'consultant_company'],
      ['consultant_company'],
    );

    let companyId: number | null = null;
    let crmSyncEnabled = false;
    const appId = consultant.app_id;

    const customers: number[] = [];

    if (consultant.consultant_company?.id) {
      companyId = consultant.consultant_company.id;

      const company = await this.companies.getOneCompanyByFilters(
        { id: companyId },
        ['is_crm_sync'],
        [],
      );

      crmSyncEnabled = !!company?.is_crm_sync;

      if (crmSyncEnabled) {
        const colleagues = await this.ConsultantsRepository.find({
          where: { consultant_company: { id: companyId } },
        });

        for (const colleague of colleagues) {
          if (colleague.app_id !== appId) continue;

          const customersData = await this.customerService.getCustomersByConsultant({
            id: colleague.id,
          });

          const filteredCustomers = (customersData.data ?? []).filter((c: any) => {
            return !c.app_id || c.app_id === appId;
          });

          customers.push(...filteredCustomers.map((c: any) => c.id));
        }
      } else {
        const customersData = await this.customerService.getCustomersByConsultant({
          id: consultant.id,
        });

        const filteredCustomers = (customersData.data ?? []).filter((c: any) => {
          return !c.app_id || c.app_id === appId;
        });

        customers.push(...filteredCustomers.map((c: any) => c.id));
      }
    }
    return {
      appId,
      crmSyncEnabled,
      customers,
    };
  }
  async getApplicatioUrls(applicationId: number) {
    const files = await this.companies.getCompaniesFiles(String(applicationId));

    const attachmentObject: any = {};
    files.forEach((attachment) => {
      const { name, blob } = attachment;
      const key = blob?.key;
      if (!key) {
        return;
      }

      attachmentObject[name] = `${process.env.URL}/v1/api/image/${key}`;
    });
    return {
      apk_url: attachmentObject.apk,
      old_apk_url: attachmentObject.old_apk,
      app_icon: attachmentObject.icon,
    };
  }

  public async password(data: PasswordDto, locale = 'en') {
    const { email, app_id } = data;

    const [application, consultant] = await Promise.all([
      this.applicationsService.findOneApplication(Number(app_id)),
      this.findConsultant(Number(app_id), email),
    ]);

    if (!consultant) {
      this.commonService.throwNotFoundError(locale);
    }

    const password = this.commonService.generateRandomPassword(12);
    const hashedPassword = await this.bcryptHashPassword(password);

    await this.updateConsultant(consultant.id, { password_digest: hashedPassword });

    await this.sendPasswordResetEmail(
      {
        email: consultant.email,
        password,
        name: consultant.name,
        service: application.name,
        consultant_company_id: consultant.consultant_company_id,
        app_consultant_company_id: application?.consultant_company_id,
      },
      locale,
    );

    return this.commonService.generateMessage('Success!');
  }

  public async sendPasswordResetEmail(data: any, locale = 'en') {
    const {
      email,
      password,
      service,
      name,
      consultant_company_id,
      app_consultant_company_id,
      app_id,
    } = data;

    const nameValue = name || 'Customer';
    const serviceValue = service || 'Chowis';
    const brandId = consultant_company_id ?? app_consultant_company_id;

    const mailerInfo = resolveEmailBrandConfig({
      consultantCompanyId: brandId,
      appId: app_id,
      appName: serviceValue,
      fallbackKey: 'choicetech',
    });

    const { subject, templateContext } = this.mailTemplateService.buildPasswordRecoveryTemplate({
      locale,
      brandConfig: mailerInfo,
      name: nameValue,
      appName: serviceValue,
      password,
      defaultName: 'Customer',
    });

    await this.mailDispatchService.sendBrandedEmail({
      to: email,
      subject,
      templateName: 'password-recovery',
      templateContext,
      emailProvider: mailerInfo.emailProvider,
      appId: app_id,
      appName: serviceValue,
    });
  }

  public async passwordChange(consultantId: number, data: PasswrodChangeDto, locale = 'en') {
    const { new_password, password } = data;

    const consultant = await this.getConsultant({ id: consultantId }, [
      'id',
      'email',
      'name',
      'password_digest',
      'app_id',
      'consultant_company_id',
    ]);

    if (!consultant) {
      this.commonService.throwNotFoundError(locale);
    }

    const confirmPwd = await this.verifyPassword(
      password,
      consultant.password_digest ?? null,
      locale,
    );

    if (!confirmPwd) {
      throw ErrorExceptionFactory.createFromStatus(
        'unauthorized',
        ErrorStatus.INCORRECT_PASSWORD,
        undefined,
        locale,
      );
    }

    const password_digest = await this.bcryptHashPassword(new_password);

    const updatedConsultant = await this.updateConsultant(consultantId, {
      password_digest,
    });

    if (!updatedConsultant.affected) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.PASSWORD_CHANGE_FAILED,
        undefined,
        locale,
      );
    }

    const application = await this.applicationsService.findOneApplication(
      Number(consultant.app_id),
    );
    const mailerInfo = resolveEmailBrandConfig({
      consultantCompanyId: consultant.consultant_company_id,
      appId: consultant.app_id,
      appName: application.name,
      fallbackKey: 'choicetech',
    });
    const { subject, templateContext } = this.mailTemplateService.buildPasswordResetSuccessTemplate(
      {
        locale,
        brandConfig: mailerInfo,
        name: consultant.name ? consultant.name : 'Consultant',
        appName: application.name,
        defaultName: 'Consultant',
      },
    );

    if (consultant.email) {
      await this.mailDispatchService.sendBrandedEmail({
        to: consultant.email,
        subject,
        templateName: 'password-reset-success',
        templateContext,
        emailProvider: mailerInfo.emailProvider,
        appId: consultant.app_id,
        appName: application.name,
      });
    }

    return this.commonService.generateMessage('Success!');
  }

  public async passwordChangeNew(token: string, locale = 'en') {
    const consultant = await this.getConsultant({ recovery_password_digest: token });

    if (!consultant) {
      this.commonService.throwNotFoundError(locale);
    }

    return this.templateRenderService.renderTemplate(
      'email-templates',
      'password-recovery-form',
      this.templateRenderService.buildPasswordRecoveryFormContext(locale, {
        email: consultant.email,
        recoverPasswordToken: token,
        link: `${process.env.EMAIL_URL}/consultants/update-password`,
        successLink: `${process.env.EMAIL_URL}/consultants/passord-changed`,
        appId: consultant.app_id,
      }),
    );
  }

  public async passwordRecovery(data: PasswordDto, locale = 'en') {
    const { email, app_id } = data;

    const [foundConsultant, application] = await Promise.all([
      this.findConsultant(Number(app_id), email),
      this.applicationsService.findOneApplication(Number(app_id)),
    ]);
    let consultant = foundConsultant;

    if (!consultant) {
      consultant = await this.getConsultant({ email });

      if (!consultant) {
        this.commonService.throwNotFoundError(locale);
      }
    }

    const token = await this.jwtService.generateToken(
      { id: consultant.id, email: consultant.email, role: Role.Consultant },
      TokenTypeEnum.RESET_PASSWORD,
      '',
    );

    await this.updateConsultant(consultant.id, { recovery_password_digest: token });

    const link = `${process.env.EMAIL_URL}/consultants/password-change?token=${token}`;

    const brandId = consultant.consultant_company_id;

    const mailerInfo = resolveEmailBrandConfig({
      consultantCompanyId: brandId,
      appId: app_id,
      appName: application?.name,
      fallbackKey: 'choicetech',
    });

    const brandName = mailerInfo.displayName || 'Chowis';

    const lang = locale ?? 'en';

    const engTranslate = this.commonService.getTranslation('en')?.['en']?.mailers || {};
    const localeTranslate = this.commonService.getTranslation(locale)?.[lang]?.mailers || {};

    const rawSubject = handlebars.compile(
      localeTranslate.password_recovery_subject || engTranslate.password_recovery_subject,
    )({ brand: mailerInfo.omitSubjectBrandName ? '' : brandName });
    const subject = mailerInfo.omitSubjectBrandName
      ? rawSubject.trim().replace(/^[-:|/\\]+/, '').trim()
      : rawSubject;

    await this.mailDispatchService.sendBrandedEmail({
      from: this.mailDispatchService.buildFromAddress(mailerInfo),
      to: consultant.email,
      subject,
      templateName: 'password-recovery-new',
      templateContext: { link },
      emailProvider: mailerInfo.emailProvider,
      appId: app_id,
      appName: application?.name,
    });

    return this.commonService.generateMessage('Email sent successfully!');
  }

  public async updatePassword(data: UpdatePasswordDto, locale = 'en') {
    const { recoveryPasswordToken, email, app_id, password, confirmPassword } = data;

    const consultant = await this.getConsultant({ email, app_id }, [
      'id',
      'email',
      'recovery_password_digest',
    ]);

    if (!consultant) {
      this.commonService.throwNotFoundError(locale);
    }

    if (consultant.recovery_password_digest !== recoveryPasswordToken) {
      throw ErrorExceptionFactory.createFromStatus(
        'unauthorized',
        ErrorStatus.UNAUTHORIZED,
        undefined,
        locale,
      );
    }

    if (password !== confirmPassword) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.BAD_REQUEST,
        undefined,
        locale,
      );
    }

    const hashedPassword = await this.bcryptHashPassword(password);

    await this.updateConsultant(consultant.id, {
      password_digest: hashedPassword,
      recovery_password_digest: null,
    });

    return this.commonService.generateMessage('Password updated successfully.');
  }

  async sendDetailsToUrl(url: string, details: any, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await axios.post(url, details, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        });
        return 'Success send data to URL';
      } catch (error) {
        if (attempt < retries) {
          await new Promise((res) => setTimeout(res, delay));
        } else {
          return 'Something went wrong while sending data!';
        }
      }
    }
  }

  public async requestCallbackUrl(
    data: RequestCallBackUrlDto,
    token: string,
    consultantId: number,
  ) {
    const batchIds = data.batch_ids;
    const results: any = [];
    const batchSize = 5;

    for (let i = 0; i < batchIds.length; i += batchSize) {
      const batch = batchIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async ({ analysis_type, batch_id }) => {
        if (batch_id) {
          try {
            const result = await this.getWebResultAnalysisByBatchId(batch_id, analysis_type, token);

            return result.map((h: any) => ({
              measurement: h.measurement,
              value: h.value,
              date: h.date,
              avg_value: h.avg_value,
              keyword_value: h.keyword_value,
              batch_id,
              analysis_type,
            }));
          } catch (error) {
            return [];
          }
        }
        return [];
      });
      const resultsArray = await Promise.all(batchPromises);
      results.push(...resultsArray.flat());
    }

    const customer = await this.customerService.getCustomer(
      { id: data.customer_id },
      ['id', 'birth', 'age', 'skin_color_group_id', 'ethnicity_id', 'email', 'phone'],
      ['gender'],
    );

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    customer.gender = customer?.gender?.name ?? null;

    const customerDetails = {
      customer_id: customer.id,

      ...customer,
    };
    delete customerDetails.id;

    const consultant = await this.getConsultant(
      { id: consultantId },
      ['id', 'name', 'email'],
      ['consultant_company.consultantCustomzations', 'products.device'],
    );

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const url = consultant.consultant_company?.consultantCustomzations[0]?.data_exchange_url;

    delete consultant.consultant_company;

    const consultantDetails = {
      consultant_id: consultant.id,
      ...consultant,
    };
    delete consultantDetails.id;

    const details: any = {
      consultant: consultantDetails,
      customer: customerDetails,
      bc_name: consultant.name,
      branch_name: null,
      device_code:
        consultant.products.length > 0 ? consultant?.products[0].device['optic_number'] : null,
      analysis: results,
    };

    delete consultant.products[0];
    delete details.consultant.products;

    let message = 'Data exchange URL is missing for company';
    const MAX_PAYLOAD_SIZE = 1 * 1024 * 1024;
    if (url) {
      const detailsStr = JSON.stringify(details);
      if (detailsStr.length > MAX_PAYLOAD_SIZE) {
        const chunks = [];
        for (let i = 0; i < details.analysis.length; i += batchSize) {
          const chunk = {
            ...details,
            analysis: details.analysis.slice(i, i + batchSize),
          };
          chunks.push(chunk);
        }
        for (const chunk of chunks) {
          message = await this.sendDetailsToUrl(url, chunk);
        }
      } else {
        message = await this.sendDetailsToUrl(url, details);
      }
    }
    return { status: url ? HttpStatus.OK : ErrorStatus.BAD_REQUEST, body: details, message };
  }

  public async getCompany() {
    const companies = await this.companies.getCompanies();
    return companies;
  }

  public async getCompanyDetails(data: ConsultantCompanyDetailsDto) {
    const { consultant_company_id: id } = data;

    const company: any = await this.companies.getOneCompany(Number(id) ?? null);
    if (!company) return company;

    const files = await this.companies.getCompaniesFiles(id ?? String(1));
    const baseUrl = `${process.env.URL}/v1/api/image`;

    const attachmentObject = files.reduce<Record<string, string>>((acc, attachment: any) => {
      const key = attachment.blob?.key;
      if (!key) {
        return acc;
      }

      acc[attachment.name] = `${baseUrl}/${key}`;
      return acc;
    }, {});

    const rangeFields = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, i) => `${prefix}_${i + 1}`);

    const alwaysReturnEmptyStringFields = [
      'logo',
      'app_icon',
      'main_page_image',
      'background_image',
      'pmx_banner',
      'screen_saver',
      ...rangeFields('progressbar_image', 5),
    ];

    alwaysReturnEmptyStringFields.forEach((field) => {
      company[`${field}_url`] = attachmentObject[field] ?? '';
    });

    company.main_pages = Array.from({ length: 4 }, (_, i) => {
      const index = i + 1;
      const key = `main_page_${index}`;

      return attachmentObject[key]
        ? {
            index,
            url: attachmentObject[key],
          }
        : null;
    }).filter(Boolean);

    if (!company.main_pages.length && company.main_page_image_url) {
      company.main_pages = [
        {
          index: 1,
          url: company.main_page_image_url,
        },
      ];
    }

    const screenSaverPrefixes = ['screen_saver_total', 'screen_saver_skin', 'screen_saver_hair'];

    let count = 0;

    for (const prefix of screenSaverPrefixes) {
      const type = prefix.replace('screen_saver_', '');

      for (let i = 1; i <= 5; i++) {
        const dbField = `screen_saver_${i}_${type}`;
        const responseField = `${prefix}_${i}`;

        if (attachmentObject[dbField] && count < 5) {
          company[`${responseField}_url`] = attachmentObject[dbField];
          count++;
        } else {
          delete company[`${responseField}_url`];
        }
      }
    }

    return company;
  }

  public async deleteAccount(userId: number, application_id: any) {
    const consultant = await this.ConsultantsRepository.findOne({
      where: { id: userId },
    });

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    await this.recordConsultantLog(
      {
        consultant_id: consultant.id,
        app_id: consultant.app_id ?? application_id ?? null,
        email: consultant.email ?? null,
        phone: consultant.phone ?? null,
      },
      'consultant_delete',
      'delete',
    );

    await this.deleteBrevoConsultantContacts(
      [consultant.email, consultant.unconfirmed_email],
      'consultant_deleted',
    );

    const product = await this.productsService.findOneProduct({
      consultant_id: userId,
      application_id,
    });

    await this.ConsultantsRepository.delete(userId)
      .then(() => {
        if (product?.id) {
          this.productsService.updateProduct(product.id, {
            consultant_id: null,
          });
        }
      })
      .catch((error) => {
        throw error;
      });

    return this.commonService.generateMessage('Successfully remove account');
  }

  async recordConsultantLog(
    consultant: {
      consultant_id?: number | string | null;
      app_id?: number | string | null;
      email?: string | null;
      phone?: string | null;
    },
    reason: string,
    actionType: 'create' | 'update' | 'delete' = 'delete',
  ) {
    return this.consultantLogRepository.save({
      action_type: actionType,
      consultant_id: this.parseNumberOrNull(consultant.consultant_id),
      app_id: this.parseNumberOrNull(consultant.app_id),
      email: consultant.email ?? null,
      phone: consultant.phone ?? null,
      reason,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  private parseNumberOrNull(value: number | string | null | undefined): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  public async getAllLicense(data: AllLicenseDto) {
    const { application_id, optic_number } = data;

    const device = await this.devices.findOneDevices({ optic_number });
    if (!device) {
      this.commonService.throwNotFoundError();
    }

    const product = await this.productsService.findOneProduct({
      device_id: device.id,
      application_id,
    });
    if (!product) {
      this.commonService.throwNotFoundError();
    }

    const licenses = await this.licenceService.findLicence({ id: product.license_id });
    if (!licenses) {
      this.commonService.throwNotFoundError();
    }

    return { data: licenses };
  }

  public async changeLicense(consultantID: number, data: ChangeLicenseDto) {
    const { optic_number, license_id } = data;

    const [license, devices] = await Promise.all([
      this.licenceService.findLicence({ id: license_id }),
      this.devices.findDevices({ optic_number }),
    ]);

    if (!license || !devices) {
      this.commonService.throwNotFoundError();
    }

    const deviceIds = devices.map((device: Devices) => device.id);
    const products = await this.productsService.findProduct({
      device_id: In(deviceIds),
      consultant_id: consultantID,
    });

    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    const productIdsToUpdate = products
      .filter((product) => String(product.license_id) !== String(license[0]?.id))
      .map((product) => product.id);

    if (!productIdsToUpdate.length) {
      return this.commonService.generateMessage('License changed successfully');
    }

    const updateResult = await this.productsService.updateProducts(
      { id: In(productIdsToUpdate), consultant_id: consultantID },
      {
        license_id: String(license[0].id),
      },
    );

    if (!updateResult.affected) {
      this.commonService.throwNotFoundError();
    }

    return this.commonService.generateMessage('License changed successfully');
  }

  public async notifySalesChangeLicense(consultantId: number, data: NotifySalesChangeLicenseDto) {
    const { optic_number, license_id } = data;

    const [licenses, devices] = await Promise.all([
      this.licenceService.findLicence({ id: license_id }),
      this.devices.findDevices({ optic_number }),
    ]);

    if (!licenses || !devices.length) {
      this.commonService.throwNotFoundError();
    }

    const deviceIds = devices.map((device: Devices) => Number(device.id));
    const products = await this.productsService.findProduct({
      device_id: In(deviceIds),
      consultant_id: consultantId,
    });

    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    const notification = this.notificationRepository.create({
      target_type: TargetType.Consultant,
      target_id: String(consultantId),
      kind: 'license-change-request',
      title: 'License change request submitted',
      content: `Optic number ${optic_number} requested license change to ${
        licenses[0]?.name ?? license_id
      }.`,
      created_at: new Date(),
      updated_at: new Date(),
      fcmSent: false,
    });

    await this.notificationRepository.save(notification);

    return this.commonService.generateMessage('Success!');
  }

  public async calculatePrice(consultantId: number, data: CalculatePriceDto) {
    const { duration, license_id, optic_number, selection_type, time_type } = data;
    let cost = 0;

    let deviceIds = await this.devices.findDevices({ optic_number: In(optic_number.split(',')) }, [
      'id',
    ]);
    deviceIds = deviceIds.map((d: { id: string }) => Number(d.id));

    const products = await this.productsService.findProduct({
      device_id: In(deviceIds),
      consultant_id: consultantId,
    });
    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    switch (selection_type) {
      case 'change':
        for (const product of products) {
          const remaining = this.daysLeftFromExpired(
            Number(product.license_period),
            product.first_use_date,
          );
          if (remaining < 1) {
            throw ErrorExceptionFactory.createFromStatus(
              'badRequest',
              ErrorStatus.CUSTOM_ERROR_CONSULTANT,
            );
          }

          cost += await new Promise<number>(async (resolve, reject) => {
            await this.newChangeLicenseCost(
              license_id,
              product.license_id,
              Number(product.application_id),
              product.first_use_date,
              Number(product.id),
              product.license_period,
              product.license_remaining_days,
            )
              .then((newCost) => resolve(newCost))
              .catch(() => {
                reject(
                  ErrorExceptionFactory.createFromStatus(
                    'badRequest',
                    ErrorStatus.CUSTOM_ERROR_CONSULTANT,
                  ),
                );
              });
          });
        }

        break;
      case 'extend':
        if (!duration || !time_type) {
          throw ErrorExceptionFactory.createFromStatus(
            'badRequest',
            ErrorStatus.CUSTOM_ERROR_CONSULTANT,
          );
        }
        for (const product of products) {
          const licenseId = product.license_id;
          cost += await new Promise<number>(async (resolve, reject) => {
            await this.extendLicenseCost(
              Number(licenseId),
              Number(duration),
              time_type,
              Number(product.application_id),
            )
              .then((newCost) => resolve(newCost))
              .catch(() => {
                reject(
                  ErrorExceptionFactory.createFromStatus(
                    'badRequest',
                    ErrorStatus.CUSTOM_ERROR_CONSULTANT,
                  ),
                );
              });
          });
        }

        break;

      default:
        throw ErrorExceptionFactory.createFromStatus(
          'badRequest',
          ErrorStatus.CUSTOM_ERROR_CONSULTANT,
        );
    }

    return { message: 'Success', total_cost: cost.toFixed(2) };
  }

  public async updateLicense(data: UpdateLicenseDto) {
    const { optic_number, duration, time_type } = data;

    const device = await this.devices.findOneDevices({ optic_number });
    const product = await this.productsService.findOneProduct({ device_id: device.id });

    if (!device || !product) {
      this.commonService.throwNotFoundError();
    }

    const additionalDays = this.getAdditionalDays(duration, time_type);

    const newLicensePeriod = product.license_period + additionalDays;
    const newLicenseRemainingDays = this.licenseDomainService.remainingDaysFromPeriod(
      newLicensePeriod,
      product.first_use_date,
    );
    const newDaysRemainingUpdatedAt = new Date();

    const newProduct = await this.productsService.updateProduct(product.id, {
      license_period: newLicensePeriod,
      license_remaining_days: newLicenseRemainingDays,
      days_remaining_updated_at: newDaysRemainingUpdatedAt,
    });

    if (newProduct.affected < 1) {
      this.commonService.throwNotFoundError();
    }

    await this.licenceService.createLicenceHistory({
      licensableType: LicenseType.Product,
      licensableId: String(product.id),
      expectedExpiryDate:
        this.licenseDomainService.expiredDate(product.first_use_date, newLicensePeriod) ?? null,
      extended: Number(duration),
      extendType: time_type,
      price: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.commonService.generateMessage('License updated successfully');
  }

  public async renewDevices(consultantId: number, data: RenewDevicesDto) {
    const { optic_numbers, duration, time_type, submit_license_extension } = data;

    if (submit_license_extension !== 'true') {
      return this.commonService.generateMessage('Success!');
    }

    const additionalDays = this.getAdditionalDays(duration, time_type);
    if (additionalDays > 1095) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    const parsedOpticNumbers = Array.isArray(optic_numbers)
      ? optic_numbers
      : String(optic_numbers)
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);

    const devices = await this.devices.findDevices({ optic_number: In(parsedOpticNumbers) }, [
      'id',
    ]);
    if (!devices.length) {
      this.commonService.throwNotFoundError();
    }

    const deviceIds = devices.map((device: Devices) => Number(device.id));
    const products = await this.productsService.findProduct({
      device_id: In(deviceIds),
      consultant_id: consultantId,
    });

    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    const exceedingProduct = products.find(
      (product) => Number(product.license_period ?? 0) + additionalDays > 1095,
    );
    if (exceedingProduct) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    const updateResults = await Promise.all(
      products.map((product) =>
        this.productsService.updateProduct(product.id, {
          license_period: Number(product.license_period ?? 0) + additionalDays,
          license_remaining_days: this.licenseDomainService.remainingDaysFromPeriod(
            Number(product.license_period ?? 0) + additionalDays,
            product.first_use_date,
          ),
          days_remaining_updated_at: new Date(),
        }),
      ),
    );

    if (updateResults.some((result) => !result.affected)) {
      this.commonService.throwNotFoundError();
    }

    await Promise.all(
      products.map((product) =>
        this.licenceService.createLicenceHistory({
          licensableType: LicenseType.Product,
          licensableId: String(product.id),
          expectedExpiryDate:
            this.licenseDomainService.expiredDate(
              product.first_use_date,
              Number(product.license_period ?? 0) + additionalDays,
            ) ?? null,
          extended: Number(duration),
          extendType: time_type,
          price: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    );

    return this.commonService.generateMessage('License updated successfully');
  }

  private getAdditionalDays(duration: string, time_type: string) {
    const additionalDays = this.licenseDomainService.getAdditionalDays(duration, time_type);
    if (additionalDays === null) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }
    return additionalDays;
  }

  public async loginSocial(
    data: LoginSocialDto,
    email: string,
    locale = 'en',
    company: string | null,
  ) {
    const { app_id, tokenId } = data;
    let consultant;

    try {
      consultant = await this.validateUserSocial(email, Number(app_id), tokenId);
    } catch (error) {
      this.monitoringService.recordAuthLogin('failure', 'social');
      throw error;
    }

    const checkToken = this.authService.isTokenExpired(consultant.token);

    if (!consultant.email_confirmed) {
      if (!checkToken) {
        const confirmationToken = await this.jwtService.generateToken(
          { id: consultant.id, email: consultant.email, role: Role.Consultant },
          TokenTypeEnum.CONFIRMATION,
          '',
        );
        await this.updateConsultant(consultant.id, {
          confirm_token: confirmationToken,
        });

        const application = await this.applicationsService.findOneApplication(Number(app_id));

        await this.sendAccountConfimationEmail(
          confirmationToken,
          {
            email: consultant.email,
            name: consultant.name,
            service: application?.name,
            consultant_company_id:
              consultant.consultant_company_id ?? application?.consultant_company_id,
          },
          locale,
          company,
        );
      }

      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.EMAIL_NOT_CONFIRMED);
    }
    const [accessToken, refreshToken] = await this.authService.generateAuthTokens(
      { id: consultant.id, email: consultant.email, role: Role.Consultant },
      '',
    );
    delete consultant.password_digest;
    delete consultant.recovery_password_digest;
    delete consultant.email_confirmed;
    if (consultant?.consultant_company?.applications) {
      consultant.consultant_company.applications = [];
    }

    consultant.products.forEach((product: any) => {
      if (product.device && product.device.consultant_company) {
        product.device.consultant_company.applications = [];
      }
    });

    consultant.token = accessToken;
    consultant.refresh_token = refreshToken;

    await this.updateConsultant(consultant.id, {
      token: refreshToken,
      confirm_token: consultant.confirm_token,
    });
    this.monitoringService.recordAuthLogin('success', 'social');

    const response = {
      id: consultant.id,
      email: consultant.email,
      token: accessToken,
      refresh_token: refreshToken,
      name: consultant.name,
      surname: consultant.surname,
      phone_country_code: consultant.phone_country_code,
      os: consultant.os,
      language: consultant.language,
      phone: consultant.phone,
      address: consultant.address,
      city: consultant.city,
      zip_code: consultant.zip_code,
      state: consultant.state,
      note: consultant.note,
      push_token: consultant.push_token,
      memo: consultant.memo,
      app_id: consultant.app_id,
      company_name: consultant.company_name,
      company_address: consultant.company_address,
      branch: consultant.branch,
      position: consultant.position,
      skin_color_group_id: consultant.skin_color_group_id,
      ethnicity_id: consultant.ethnicity_id,
      callback_url: consultant.callback_url,
      code: consultant.code,
      country_id: consultant?.country_id ? Number(consultant?.country_id) : null,
      country: consultant.country_details?.name ?? null,
      gender: consultant.gender,
      social: consultant.social,
      country_code: consultant.getContryCode,
      store: consultant.consultant_shop?.name ?? null,
      consultant_shop: consultant.consultant_shop,
      country_details: consultant.country_details,
      optic_number: consultant.getOpticNumbers,
      products: consultant.products,
      consultant_company: consultant.consultant_company,
      consultant_position: consultant.consultant_position,
    };

    return orderResponseFields(response, CONSULTANT_RESPONSE_FIELD_ORDER);
  }

  public async loginPhone(data: LoginPhoneDto, consultantId: number) {
    const { phone } = data;

    const consultant = await this.getConsultant(
      { id: consultantId },
      ['customers.id', 'customers.name', 'customers.email', 'customers.phone'],
      ['customers'],
    );

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    let customers = [];

    if (consultant.customers) {
      customers = consultant.customers.filter((customer: any) => customer.phone == phone);
    }

    return customers;
  }

  public async getProductRecommendations(_data: ProductRecommendationsDto) {}

  public async refreshToken(data: any) {
    const { refresh_token } = data;

    if (!refresh_token) {
      this.monitoringService.recordTokenRefresh('failure');
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }
    const { secret: tokenAccess } = this.jwtConfig.refresh;
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, tokenAccess);
    } catch (err) {
      this.monitoringService.recordTokenRefresh('failure');
      if (err.name === 'TokenExpiredError') {
        throw ErrorExceptionFactory.createFromStatus(
          'forbidden',
          ErrorStatus.ACCESS_TOKEN_TIME_OUT,
        );
      } else if (err.name === 'JsonWebTokenError') {
        throw ErrorExceptionFactory.createFromStatus('forbidden', ErrorStatus.INVALID_ACCESS_TOKEN);
      } else if (err.name === 'NotBeforeError') {
        throw ErrorExceptionFactory.createFromStatus('forbidden', ErrorStatus.INVALID_ACCESS_TOKEN);
      }
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }

    const { id } = decoded as any;

    const consultant = await this.getConsultant({ id }, ['id', 'token', 'email']);

    if (!consultant) {
      this.monitoringService.recordTokenRefresh('failure');
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }

    const [accessToken, new_refresh_token] = await this.authService.generateAuthTokens(
      { id: consultant.id, email: consultant.email, role: Role.Consultant },
      '',
    );
    await this.updateConsultant(consultant.id, {
      token: new_refresh_token,
    });
    this.monitoringService.recordTokenRefresh('success');

    return {
      token: accessToken,
      refresh_token: new_refresh_token,
    };
  }

  public async sendDeviceActivationEmail(data: any, locale = 'en') {
    const { email, deviceNumber, name, appName, consultant_company_id, app_id } = data;

    const mailerInfo = resolveEmailBrandConfig({
      consultantCompanyId: consultant_company_id,
      appId: app_id,
      appName,
      fallbackKey: 'choicetech',
    });
    const { subject, templateContext } = this.mailTemplateService.buildDeviceActivationTemplate({
      locale,
      brandConfig: mailerInfo,
      name,
      appName,
      deviceNumber,
      email,
      defaultName: 'Consultant',
    });

    const result = await this.mailDispatchService.sendBrandedEmail({
      to: email,
      subject,
      templateName: 'device-activation',
      templateContext,
      emailProvider: mailerInfo.emailProvider,
      appId: app_id,
      appName,
    });
    return result;
  }

  public async enter2ndProduct(
    userTokenData: any,
    deviceId: number,
    useDate: any,
    useTime: any,
    macAddress: any,
  ) {
    const app_id = userTokenData.app_id === 44 ? 53 : 44;
    const email = userTokenData['sub'];

    const { id } = await this.findConsultant(app_id, email);

    const product = await this.productsService.findOneProduct(
      { application_id: app_id, device_id: deviceId },
      [],
      ['license', 'application', 'consultant'],
    );

    const updateProductResponse = await this.productsService.updateProduct(product.id, {
      consultant_id: id,
      use_date: useDate,
      use_time: useTime,
      mac_address: macAddress,
      app_use_yn: 'Y',
      first_use_date: useDate?.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
    });

    const versionData = {
      itemId: product.id,
      itemType: VersionItemType.Product,
      event: VersionEvent.Update,
      object: JSON.stringify(product),
      objectChanges: JSON.stringify(updateProductResponse),
      comments: 'done by api, triggered by user',
      whodunnit: id,
      createdAt: new Date(),
    };

    await this.versionsRepository.save(versionData);

    return true;
  }

  public async enterProducts(
    consultantId: number,
    data: EnterProductDto,
    userTokenData: any,
    locale = 'en',
  ) {
    const { password, application_id, mac_address, lat, lng } = data;
    const optic_number = data.optic_number.toUpperCase();

    const latt = lat ?? null;
    const long = lng ?? null;
    const macAddress = mac_address ?? '';

    const useDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const useTime = new Date().toISOString().slice(11, 16).replace(/:/g, '');

    const consultant = await this.findOneConsultant(consultantId);

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const device = await this.devices.findOneDevices({ optic_number, pwd: password });

    if (!device) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.PRODUCT_NOT_FOUND);
    }

    const product = await this.productsService.findOneProduct(
      { application_id: application_id, device_id: device.id },
      [],
      ['license', 'application', 'consultant'],
    );

    if (!product) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.LICENSE_NOT_FOUND);
    }

    if (!product.license) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.LICENSE_NOT_FOUND);
    }

    if (product.consultant && Number(product.consultant_id) !== Number(consultant.id)) {
      throw ErrorExceptionFactory.createFromStatus(
        'conflict',
        ErrorStatus.DEVICE_ALREADY_REGISTERED,
      );
    }

    const updateProductResponse = await this.productsService.updateProduct(product.id, {
      consultant_id: consultant.is_agent ? null : consultant.id,
      use_date: consultant.is_agent ? null : useDate,
      use_time: consultant.is_agent ? null : useTime,
      mac_address: consultant.is_agent ? null : macAddress,
      app_use_yn: 'Y',
    });

    if (!updateProductResponse.affected) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    let updatedProduct: any = await this.productsService.findOneProduct(
      { id: product.id },
      [],
      ['device', 'license', 'application'],
    );

    await this.versionsRepository.save({
      itemId: product.id,
      itemType: VersionItemType.Product,
      event: VersionEvent.Update,
      object: JSON.stringify(product),
      objectChanges: JSON.stringify(updatedProduct),
      comments: 'done by api, triggered by user',
      whodunnit: consultant.id,
      createdAt: new Date(),
    });

    if (device.consultant_company_id) {
      await this.updateConsultant(consultant.id, {
        consultant_company_id: device.consultant_company_id,
      });
    }

    if (!product.first_use_date || product.first_use_date === null) {
      await this.productsService.updateProduct(product.id, {
        consultant_id: consultant.id,
        first_use_date: consultant.is_agent ? updatedProduct.first_use_date : new Date(),
      });

      updatedProduct = await this.productsService.findOneProduct(
        { id: product.id },
        [],
        ['device', 'license', 'application'],
      );

      await this.versionsRepository.save({
        itemId: product.id,
        itemType: VersionItemType.Product,
        event: VersionEvent.Update,
        object: JSON.stringify(product),
        objectChanges: JSON.stringify(updatedProduct),
        comments: 'done by api, triggered by user',
        whodunnit: consultant.id,
        createdAt: new Date(),
      });

      if (consultant.email) {
        const application = await this.applicationsService.findOneApplication(
          Number(application_id),
        );

        await this.sendDeviceActivationEmail(
          {
            email: consultant.email,
            deviceNumber: device.optic_number,
            name: consultant.name,
            appName: application.name || 'Chowis',
            consultant_company_id: consultant.consultant_company_id,
            app_id: application_id,
          },
          locale,
        );
      }
    }

    await this.devices.updateDevice(device.id, {
      lat: latt,
      lng: long,
      consultant_shop_id: consultant.consultant_shop_id ?? null,
    });

    try {
      await this.syncBrevoConsultant(consultant.id);
    } catch (e) {
      this.logger.warn(`[Brevo sync failed] ${e instanceof Error ? e.message : e}`);
    }

    if (device.consultant_company_id) {
      updatedProduct.device.consultant_company = await this.getCompanyDetails({
        consultant_company_id: device.consultant_company_id,
      });

      if (updatedProduct.device.consultant_company) {
        if (updatedProduct.license?.name?.toLowerCase() === 'standard') {
          updatedProduct.device.consultant_company.image_upload = false;
        }

        if (updatedProduct.device.consultant_company.id === 1) {
          updatedProduct.device.consultant_company.image_upload = consultant.image_upload;
        }
      }
    }

    const expiryMeta = this.licenseDomainService.resolveExpiryMeta({
      firstUseDate: product.first_use_date,
      licensePeriod: product.license_period,
      licenseName: updatedProduct.license?.name,
    });
    updatedProduct.expired_date = expiryMeta.expiredDate;
    updatedProduct.is_expired = expiryMeta.isExpired;

    const files = await this.companies.getCompaniesFiles(String(updatedProduct.application.id));
    const attachmentObject: any = {};
    files.forEach((attachment) => {
      const { name, blob } = attachment;
      const key = blob?.key;
      if (!key) {
        return;
      }

      attachmentObject[name] = `${process.env.URL}/v1/api/image/${key}`;
    });
    updatedProduct.application.apk_url = attachmentObject.apk;
    updatedProduct.application.old_apk_url = attachmentObject.old_apk;
    updatedProduct.application.app_icon = attachmentObject.icon;

    if (!consultant.is_agent === true || consultant.is_agent === null) {
      updatedProduct = this.changeExpiredlicense(updatedProduct, consultant.is_agent);
    }

    return {
      result_code: '0',
      product: updatedProduct,
    };
  }

  async getNotifications(id: number, data: GetNotificationsDto) {
    const notifications = await this.findNotifications(
      { target_id: id, target_type: TargetType.Consultant },
      [],
      [],
      data.title ?? '',
      Number(data.page),
      Number(data.per),
    );

    return notifications;
  }

  async deleteNotification(id: number) {
    const notifications = await this.notificationRepository.delete(id);

    if (!notifications.affected) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    return this.commonService.generateMessage('Success delete notification');
  }

  daysLeftFromExpired(licensePeriod: number, firstUseDate: string) {
    return this.licenseDomainService.daysLeftFromExpired(licensePeriod, firstUseDate);
  }

  async newChangeLicenseCost(
    newLicenseId: string,
    oldLicenseId: string,
    applicationId: number,
    firstUseDate: string,
    productId: number,
    licensePeriod: number,
    remainingDays: number,
  ): Promise<number> {
    let cost = 0;
    const applicationLicense = await this.licenceService.findApplicationLicence({
      applicationId: applicationId,
      licenseId: newLicenseId,
    });
    const oldApplicationLicense = await this.licenceService.findApplicationLicence({
      applicationId: applicationId,
      licenseId: oldLicenseId,
    });

    if (!applicationLicense || !oldApplicationLicense) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }

    const licenseHistories = await this.licenceService.findLicenceHistories(
      { licensableId: productId, licensableType: LicenseType.Product },
      { createdAt: { direction: 'DESC' } },
    );
    const licenseHistory = licenseHistories[licenseHistories.length - 1];

    if (firstUseDate) {
      if (licenseHistory) {
        const extendedDays = this.expectedDaysIncrease(
          licenseHistory.extended,
          licenseHistory.extendType,
          firstUseDate,
          licensePeriod,
        );
        if (licenseHistories.length > 1) {
          let initialCost, newCost, extendedPrice;
          let initialDays = this.getInitialDaysSumFromHistory(
            licenseHistories,
            firstUseDate,
            licensePeriod,
          );
          initialDays = this.getInitialDays(initialDays, licensePeriod);

          switch (initialDays) {
            case 1095:
              initialCost = oldApplicationLicense.licenseChangeThreeYearPrice;
              newCost = applicationLicense.licenseChangeThreeYearPrice;
              extendedPrice = oldApplicationLicense.licenseExtendThreeYearPrice;
              break;
            case 730:
              initialCost = oldApplicationLicense.licenseChangeTwoYearPrice;
              newCost = applicationLicense.licenseChangeTwoYearPrice;
              extendedPrice = oldApplicationLicense.licenseExtendTwoYearPrice;
              break;
            case 365:
              initialCost = oldApplicationLicense.licenseChangeOneYearPrice;
              newCost = applicationLicense.licenseChangeOneYearPrice;
              extendedPrice = oldApplicationLicense.licenseExtendOneYearPrice;
              break;
            case 30:
              initialCost = oldApplicationLicense.licenseChangeOneMonthPrice;
              newCost = applicationLicense.licenseChangeOneMonthPrice;
              extendedPrice = oldApplicationLicense.licenseExtendOneMonthPrice;
              break;
            default:
              throw ErrorExceptionFactory.createFromStatus(
                'badRequest',
                ErrorStatus.CUSTOM_ERROR_CONSULTANT,
              );
          }

          if (remainingDays === extendedDays) {
            cost = newCost - extendedPrice;
          } else if (remainingDays < extendedDays) {
            const extensionUsedDays = extendedDays - remainingDays;
            const totalDays = extendedDays - extensionUsedDays;
            cost =
              totalDays * (newCost / extendedDays) - totalDays * (extendedPrice / extendedDays);
          } else if (remainingDays >= extendedDays) {
            const upgradeCosts = this.getUpgradeCosts(applicationLicense);
            cost = await this.calculateUpgradeCost(
              upgradeCosts,
              initialCost,
              productId,
              firstUseDate,
              licensePeriod,
            );
          }
        } else {
          let initialCost, newCost, extendedPrice;
          const initialDays = this.getInitialDays(extendedDays, licensePeriod);

          switch (initialDays) {
            case 1095:
              initialCost = oldApplicationLicense.licenseChangeThreeYearPrice;
              newCost = applicationLicense.licenseChangeThreeYearPrice;
              extendedPrice = oldApplicationLicense.licenseExtendThreeYearPrice;
              break;
            case 730:
              initialCost = oldApplicationLicense.licenseChangeTwoYearPrice;
              newCost = applicationLicense.licenseChangeTwoYearPrice;
              extendedPrice = oldApplicationLicense.licenseExtendTwoYearPrice;
              break;
            case 365:
              initialCost = oldApplicationLicense.licenseChangeOneYearPrice;
              newCost = applicationLicense.licenseChangeOneYearPrice;
              extendedPrice = oldApplicationLicense.licenseExtendOneYearPrice;
              break;
            case 30:
              initialCost = oldApplicationLicense.licenseChangeOneMonthPrice;
              newCost = applicationLicense.licenseChangeOneMonthPrice;
              extendedPrice = oldApplicationLicense.licenseExtendOneMonthPrice;
              break;
            default:
              throw ErrorExceptionFactory.createFromStatus(
                'badRequest',
                ErrorStatus.CUSTOM_ERROR_CONSULTANT,
              );
          }

          if (remainingDays === extendedDays) {
            cost = newCost - extendedPrice;
          } else if (remainingDays < extendedDays) {
            const totalDays = remainingDays;
            cost =
              totalDays * (newCost / extendedDays) - totalDays * (extendedPrice / extendedDays);
          } else if (remainingDays >= extendedDays) {
            const pendingDays = remainingDays - extendedDays;
            const perDayCost = pendingDays * (initialCost / initialDays);
            cost = newCost - initialCost * perDayCost;
          }
        }
      } else {
        const initialDays = this.getInitialDays(0, licensePeriod);
        let initialCost, newCost;
        switch (initialDays) {
          case 1095:
            initialCost = oldApplicationLicense.licenseChangeThreeYearPrice;
            newCost = applicationLicense.licenseChangeThreeYearPrice;
            break;
          case 730:
            initialCost = oldApplicationLicense.licenseChangeTwoYearPrice;
            newCost = applicationLicense.licenseChangeTwoYearPrice;
            break;
          case 365:
            initialCost = oldApplicationLicense.licenseChangeOneYearPrice;
            newCost = applicationLicense.licenseChangeOneYearPrice;
            break;
          case 30:
            initialCost = oldApplicationLicense.licenseChangeOneMonthPrice;
            newCost = applicationLicense.licenseChangeOneMonthPrice;
            break;

          default:
            throw ErrorExceptionFactory.createFromStatus(
              'badRequest',
              ErrorStatus.CUSTOM_ERROR_CONSULTANT,
            );
        }
        cost = newCost - remainingDays * (initialCost / initialDays);
      }
    } else {
      if (licenseHistory) {
        const daysIncreased = this.expectedDaysIncrease(
          licenseHistory.extended,
          licenseHistory.extendType,
          firstUseDate,
          licensePeriod,
        );
        let extendedPrice, newExtendedPrice;

        switch (licenseHistory.extendType.toLowerCase()) {
          case 'years':
            if (licenseHistory.extended === 1) {
              extendedPrice = oldApplicationLicense.licenseExtendOneYearPrice;
              newExtendedPrice = applicationLicense.licenseExtendOneYearPrice;
            } else if (licenseHistory.extended === 2) {
              extendedPrice = oldApplicationLicense.licenseExtendTwoYearPrice;
              newExtendedPrice = applicationLicense.licenseExtendTwoYearPrice;
            } else if (licenseHistory.extended === 3) {
              extendedPrice = oldApplicationLicense.licenseExtendThreeYearPrice;
              newExtendedPrice = applicationLicense.licenseExtendThreeYearPrice;
            } else {
              extendedPrice =
                oldApplicationLicense.licenseExtendOneYearPrice * licenseHistory.extended;
              newExtendedPrice =
                applicationLicense.licenseExtendOneYearPrice * licenseHistory.extended;
            }
            break;

          case 'months':
            extendedPrice =
              oldApplicationLicense.licenseExtendOneMonthPrice * licenseHistory.extended;
            newExtendedPrice =
              applicationLicense.licenseExtendOneMonthPrice * licenseHistory.extended;
            break;

          case 'days':
            extendedPrice =
              Number((oldApplicationLicense.licenseExtendOneMonthPrice / 30).toFixed(2)) *
              licenseHistory.extended;
            newExtendedPrice =
              Number((applicationLicense.licenseExtendOneMonthPrice / 30).toFixed(2)) *
              licenseHistory.extended;
            break;

          default:
            throw ErrorExceptionFactory.createFromStatus(
              'badRequest',
              ErrorStatus.CUSTOM_ERROR_CONSULTANT,
            );
        }

        const initialDays = this.getInitialDays(daysIncreased, licensePeriod);
        switch (initialDays) {
          case 1095:
            cost =
              applicationLicense.licenseChangeThreeYearPrice +
              newExtendedPrice -
              (oldApplicationLicense.licenseChangeThreeYearPrice + extendedPrice);
            break;
          case 730:
            cost =
              applicationLicense.licenseChangeTwoYearPrice +
              newExtendedPrice -
              (oldApplicationLicense.licenseChangeTwoYearPrice + extendedPrice);
            break;
          case 365:
            cost =
              applicationLicense.licenseChangeOneYearPrice +
              newExtendedPrice -
              (oldApplicationLicense.licenseChangeOneYearPrice + extendedPrice);
            break;
          case 30:
            cost =
              applicationLicense.licenseChangeOneMonthPrice +
              newExtendedPrice -
              (oldApplicationLicense.licenseChangeOneMonthPrice + extendedPrice);
            break;

          default:
            throw ErrorExceptionFactory.createFromStatus(
              'badRequest',
              ErrorStatus.CUSTOM_ERROR_CONSULTANT,
            );
        }
      } else {
        switch (licensePeriod) {
          case 1095:
            cost = Number(oldApplicationLicense.licenseChangeThreeYearPrice.toFixed(2));
            cost = applicationLicense.licenseChangeThreeYearPrice - remainingDays * (cost / 1095);
            break;
          case 730:
            cost = Number(oldApplicationLicense.licenseChangeTwoYearPrice.toFixed(2));
            cost = applicationLicense.licenseChangeTwoYearPrice - remainingDays * (cost / 730);
            break;
          case 365:
            cost = Number(oldApplicationLicense.licenseChangeOneYearPrice.toFixed(2));
            cost = applicationLicense.licenseChangeOneYearPrice - remainingDays * (cost / 365);
            break;
          case 30:
            cost = Number(oldApplicationLicense.licenseChangeOneMonthPrice.toFixed(2));
            cost = applicationLicense.licenseChangeOneMonthPrice - remainingDays * (cost / 30);
            break;

          default:
            throw ErrorExceptionFactory.createFromStatus(
              'badRequest',
              ErrorStatus.CUSTOM_ERROR_CONSULTANT,
            );
        }
      }
    }

    return cost;
  }

  expiredDate(firstUseDate: string, licensePeriod: number) {
    return this.licenseDomainService.expiredDate(firstUseDate, licensePeriod);
  }

  expectedDaysIncrease(days: number, type = 'days', firstUseDate: string, licensePeriod: number) {
    const currentDate = new Date();
    let expireDate;
    if (firstUseDate && licensePeriod) {
      let expirationDate = this.expiredDate(firstUseDate, licensePeriod);
      if (this.daysLeftFromExpired(licensePeriod, firstUseDate) < 1) {
        expirationDate = currentDate;
      }
      expireDate = new Date(expirationDate.getTime() + days * this.timeTypeToMilliseconds(type));
    } else {
      expireDate = currentDate;
    }
    const calculatedDays = Math.round(
      (new Date(expireDate).getTime() - new Date(currentDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    return calculatedDays;
  }

  timeTypeToMilliseconds(type: string) {
    const milliseconds = this.licenseDomainService.timeTypeToMilliseconds(type);
    if (milliseconds === null) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR_CONSULTANT,
      );
    }
    return milliseconds;
  }

  getInitialDaysSumFromHistory(licenseHistories: any, firstUseDate: string, licensePeriod: number) {
    let sum = 0;
    licenseHistories.map((lh: any) => {
      sum += this.expectedDaysIncrease(lh.extended, lh.extendType, firstUseDate, licensePeriod);
    });
    return sum;
  }

  getInitialDays(daysIncreased: number, licensePeriod: number) {
    const num = licensePeriod - daysIncreased;
    const a = [30, 365, 730, 1095];
    const closest = a.reduce((prev, curr) =>
      Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev,
    );
    return closest;
  }

  getUpgradeCosts(al: any) {
    return {
      '365': al.licenseChangeOneYearPrice,
      '730': al.licenseChangeTwoYearPrice,
      '1025': al.licenseChangeThreeYearPrice,
      '31': al.licenseChangeOneMonthPrice,
    };
  }

  async calculateUpgradeCost(
    upgradeCosts: any,
    initialCost: number,
    productId: number,
    firstUseDate: string,
    licensePeriod: number,
  ) {
    let totalUpgradeCost = 0;
    let totalPaid = initialCost;

    const licenseHistory = await this.licenceService.findLicenceHistory(
      { licensable_id: productId, licensable_type: LicenseType.Product },
      { createdAt: { direction: 'DESC' } },
    );
    if (licenseHistory) {
      let startDate = new Date(licenseHistory.createdAt);
      const expectedDays = this.expectedDaysIncrease(
        licenseHistory.extended,
        licenseHistory.extendType,
        firstUseDate,
        licensePeriod,
      );
      let endDate = new Date(
        new Date(licenseHistory.expectedExpiryDate).getTime() -
          new Date(expectedDays * 24 * 60 * 60 * 1000).getTime(),
      );
      totalUpgradeCost = this.checkCost(startDate, endDate, upgradeCosts);
      totalPaid = initialCost;
      if (firstUseDate) {
        if (licenseHistory) {
        }
        const licenseHistories = await this.licenceService.findLicenceHistories({
          licensable_id: productId,
          licensable_type: LicenseType.Product,
          expectedExpiryDate: Not(null),
        });
        licenseHistories.map((lh) => {
          const tempExpectedDays =
            this.expectedDaysIncrease(
              licenseHistory.extended,
              licenseHistory.extendType,
              firstUseDate,
              licensePeriod,
            ) - 1;
          startDate = new Date(
            new Date(lh.expectedExpiryDate).getTime() -
              new Date(tempExpectedDays * 24 * 60 * 60 * 1000).getTime(),
          );
          endDate = lh.expectedExpiryDate;
          totalUpgradeCost = this.checkCost(startDate, endDate, upgradeCosts);
          totalPaid += lh.price;
        });
        totalUpgradeCost = Math.round(Math.max(totalUpgradeCost - totalPaid, 0));
        return totalUpgradeCost;
      } else {
        throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
      }
    }
  }

  checkCost(startDate: Date, endDate: Date, upgradeCosts: any) {
    let totalUpgradeCost = 0;
    const currentDate = new Date();

    if (currentDate <= endDate) {
      new Date(endDate).getTime();
      Math.max(new Date(currentDate).getTime(), new Date(startDate).getTime());
      const remainingDays = Math.floor(
        Math.max(
          (new Date(endDate).getTime() -
            Math.max(currentDate.getTime(), new Date(startDate).getTime())) /
            (1000 * 60 * 60 * 24),
          0,
        ),
      );

      const closestDays = Object.keys(upgradeCosts)
        .map((c) => parseInt(c, 10))
        .reduce((prev, curr) =>
          Math.abs(curr - remainingDays) < Math.abs(prev - remainingDays) ? curr : prev,
        );

      const upgradeCostForPeriod = upgradeCosts[closestDays.toString()];
      const dailyUpgradeCost = parseFloat(upgradeCostForPeriod) / closestDays;
      totalUpgradeCost = dailyUpgradeCost * remainingDays;
    }
    return totalUpgradeCost;
  }

  async extendLicenseCost(
    licenseId: number,
    duration: number,
    type: string,
    applicationId: number,
  ) {
    const al = await this.licenceService.findApplicationLicence({
      applicationId: applicationId,
      licenseId: licenseId,
    });

    if (!al) {
      this.commonService.throwNotFoundError();
    }

    let cost;
    switch (type.toLowerCase()) {
      case 'months':
        cost = al.licenseExtendOneMonthPrice * duration;
        break;

      case 'years':
        switch (duration) {
          case 3:
            cost = al.licenseExtendThreeYearPrice;
            break;
          case 2:
            cost = al.licenseExtendTwoYearPrice;
            break;
          case 1:
            cost = al.licenseExtendOneYearPrice;
            break;

          default:
            throw ErrorExceptionFactory.createFromStatus(
              'badRequest',
              ErrorStatus.CUSTOM_ERROR_CONSULTANT,
            );
        }
        break;

      case 'days':
        const cal = Number((al.licenseExtendOneMonthPrice / 30).toFixed(3));
        cost = cal * duration;
        break;
      default:
        throw ErrorExceptionFactory.createFromStatus(
          'badRequest',
          ErrorStatus.CUSTOM_ERROR_CONSULTANT,
        );
    }

    return cost;
  }

  findBatchIdByAnalysis(
    batchIds: { analysis_type: string; batch_id: string }[],
    analysisType: string,
  ) {
    return batchIds.find((b) => b.analysis_type === analysisType)?.batch_id;
  }

  async getWebResultAnalysisByBatchId(batchId: string, analysisType: string, token: string) {
    const baseUrls: any = {
      'CNDP Skin': `${process.env.CNDP_SKIN_ANALYSIS_URL}/web-result/cndpskin/${batchId}`,
      'CNDP Hair': `${process.env.CNDP_HAIR_ANALYSIS_URL}/web-result/cndphair/${batchId}`,
      FFA: `${process.env.FFA_ANALYSIS_URL}/web-result/ffa/${batchId}`,
      CFA: `${process.env.CFA_ANALYSIS_URL}/web-result/cfa-cpu/${batchId}?page=1&limit=200`,
      'CMA Hair': `${process.env.CMA_HAIR_ANALYSIS_URL}/web-result/cmahair/${batchId}?page=1&limit=200`,
      'CMA Skin': `${process.env.CMA_SKIN_ANALYSIS_URL}/web-result/cmaskin/${batchId}?page=1&limit=200`,
    };

    const baseUrl = baseUrls[analysisType];
    if (!baseUrl) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const stopAnalysisApiTimer = this.monitoringService.startAnalysisApiTimer(analysisType);

    try {
      const response = await axios.get(baseUrl, {
        timeout: 30000,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      stopAnalysisApiTimer('success');
      return response.data.body || response.data.data;
    } catch (error) {
      stopAnalysisApiTimer(
        error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED' ? 'timeout' : 'failure',
      );
      this.logger.error('[consultants/analysis] failed', error);
      throw attachAirbrakeContext(
        ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR),
        {
          failureCategory: 'analysis',
          failureOperation: 'analysis-api-fetch',
          analysisType,
          upstream: 'analysis-api',
          upstreamStatus: error?.response?.status ?? null,
          timeout: error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED',
        },
      );
    }
  }

  getLastPartOfToken(token: string) {
    const parts = token.split('.');
    return parts[parts.length - 1];
  }

  mapLicense(license: any, offlineQo: any) {
    let mapping: any = {};

    if (license === 'pro-ai') {
      license = 'professional';
    } else if (license === 'expert-ai') {
      license = 'expert';
    } else {
      license = license;
    }

    if (offlineQo === true) {
      mapping = {
        expert: { id: 3, name: 'Off QO Pro' },
        professional: { id: 3, name: 'Off QO Pro' },
        standard: { id: 3, name: 'Off QO Pro' },
      };
    } else {
      mapping = {
        expert: { id: 1, name: 'Off PR Pro' },
        professional: { id: 1, name: 'Off PR Pro' },
        standard: { id: 1, name: 'Off PR Pro' },
      };
    }

    return mapping[license] || null;
  }

  changeExpiredlicense(products: any, isAgent: boolean) {
    if (products.length > 0) {
      products.forEach((data: any) => {
        if (data.license?.name.toLowerCase() === 'standard') {
          data.license.id = 5;
          data.license.name = 'STANDARD';

          data.license = data.license;
        } else if (data.is_expired === true) {
          const newLicense = this.mapLicense(
            data.license.name.toLowerCase(),
            data.device.offline_qo,
          );

          if (newLicense !== null) {
            data.license.id = newLicense.id;
            data.license.name = newLicense.name;
          }

          data.license = data.license;
        } else {
          if (isAgent === true) {
            data.license.id = 5;
            data.license.name = 'STANDARD';
          }

          data = data;
        }
      });
    } else {
      if (products.is_expired === true && products.license?.name.toLowerCase() !== 'standard') {
        const newLicense = this.mapLicense(
          products.license.name.toLowerCase(),
          products.device.offline_qo,
        );

        if (newLicense !== null) {
          products.license.id = newLicense.id;
          products.license.name = newLicense.name;
        }
        products.license = products.license;
      }
    }

    return products;
  }
}
