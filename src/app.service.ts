import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, ILike } from 'typeorm';
import {
  FetchFwVersionDto,
  LoginSocialDto,
  ShareWebResultDto,
  ShopListDto,
  UpdateFwVersionDto,
} from './app.dto';
import { ConsultantShopsService } from './modules/consultantShops/consultantShops.service';
import { DeviceService } from './modules/devices/devices.service';
import { CountriesListDto } from './modules/customers/customers.dto';
import { CountriesService } from './modules/countries/countries.service';
import { GendersService } from './modules/genders/genders.service';
import { SkinColorGroupsService } from './modules/skinColorGroups/skinColorGroups.service';
import { EthinicitiesService } from './modules/ethinicities/ethinicities.service';
import { CustomersService } from './modules/customers/customers.service';
import { CommonService } from './common/common.service';
import { MailDispatchService } from './common/mail-dispatch.service';
import { MailTemplateService } from './common/mail-template.service';
import { ProductsService } from './modules/products/products.service';
import { ErrorStatus } from './common/constants/error-status';
import { ConsultantsService } from './modules/consultants/consultants.service';
import { AuthGoogleService } from './jwt/google.service';
import { WebResultService } from './modules/webResultManagement/webResultManagement.service';
import * as QRCode from 'qrcode';
import * as zlib from 'zlib';
import * as Jwt from 'jsonwebtoken';
import { resolveEmailBrandConfig } from '@config';
import { ErrorExceptionFactory } from './common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @Inject(ConsultantShopsService)
    private readonly consultantShops: ConsultantShopsService,

    @Inject(DeviceService)
    private readonly deviceService: DeviceService,

    @Inject(EthinicitiesService)
    private readonly ethnicities: EthinicitiesService,

    @Inject(SkinColorGroupsService)
    private readonly skinColorGroups: SkinColorGroupsService,

    @Inject(GendersService)
    private readonly genders: GendersService,

    @Inject(CountriesService)
    private readonly countries: CountriesService,

    private readonly customersService: CustomersService,
    private readonly commonService: CommonService,
    private readonly mailDispatchService: MailDispatchService,
    private readonly mailTemplateService: MailTemplateService,
    private readonly productsService: ProductsService,
    private readonly consultant: ConsultantsService,
    private readonly customer: CustomersService,
    private readonly google: AuthGoogleService,
    @Inject(WebResultService)
    private readonly webResult: WebResultService,
  ) {}

  async shopList(params: ShopListDto) {
    const select = [
      'id',
      'name',
      'country_id',
      'consultant_company_id',
      'shop_code',
      'postal_code',
    ];
    const { consultant_company_id } = params;
    const shopList = await this.consultantShops.findConsultantShops(
      {
        consultant_company_id,
      },
      select,
    );
    return shopList;
  }

  private formatCustomerDisplayName(
    customer: { name?: string | null; surname?: string | null },
    locale = 'en',
  ) {
    const normalizedLocale = locale.toLowerCase();
    const isKorean = normalizedLocale === 'ko' || normalizedLocale.startsWith('ko-');

    const orderedNames = isKorean
      ? [customer.surname, customer.name]
      : [customer.name, customer.surname];

    return orderedNames.filter(Boolean).join(' ').trim();
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
    return value;
  }

  private buildImageUrl(keyOrUrl?: string | null): string | undefined {
    if (!keyOrUrl) {
      return undefined;
    }

    if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
      return keyOrUrl;
    }

    const baseUrl = process.env.URL || 'https://example.com';
    return `${baseUrl.replace(/\/$/, '')}/v1/api/image/${keyOrUrl}`;
  }

  private async findShareResultConsultant(consultantId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT id, app_id, consultant_company_id, name
      FROM consultants
      WHERE id = $1
      LIMIT 1
      `,
      [consultantId],
    );

    return rows[0] ?? null;
  }

  private async findShareResultCustomer(customerId: number) {
    const rows = await this.dataSource.query(
      `
      SELECT id, email, name, surname
      FROM customers
      WHERE id = $1
      LIMIT 1
      `,
      [customerId],
    );

    return rows[0] ?? null;
  }

  private async findShareResultApplication(appId: number) {
    if (!Number.isFinite(appId) || appId <= 0) {
      return null;
    }

    const rows = await this.dataSource.query(
      `
      SELECT id, name, consultant_company_id
      FROM applications
      WHERE id = $1
      LIMIT 1
      `,
      [appId],
    );

    const application = rows[0] ?? null;
    if (!application) {
      return null;
    }

    const iconRows = await this.dataSource.query(
      `
      SELECT b.key
      FROM active_storage_attachments a
      JOIN active_storage_blobs b ON b.id = a.blob_id
      WHERE a.record_type = 'Application'
        AND a.record_id = $1
        AND a.name = 'icon'
      ORDER BY a.created_at DESC
      LIMIT 1
      `,
      [appId],
    );

    return {
      ...application,
      icon: this.buildImageUrl(iconRows[0]?.key),
    };
  }

  private resolveShareResultLogoUrl(icon?: string | null, fallbackIcon?: string): string {
    const fallbackLogo =
      fallbackIcon ?? 'https://example.com/v1/api/image/example-image';
    const normalizedIcon = typeof icon === 'string' ? icon.trim() : '';

    if (!normalizedIcon) {
      return fallbackLogo;
    }

    if (normalizedIcon.startsWith('http://') || normalizedIcon.startsWith('https://')) {
      return normalizedIcon;
    }

    if (normalizedIcon.startsWith('//')) {
      return `https:${normalizedIcon}`;
    }

    if (normalizedIcon.startsWith('/')) {
      return `https://example.com${normalizedIcon}`;
    }

    return `https://${normalizedIcon}`;
  }

  private async findShareResultCompany(companyId: number) {
    const baseRows = await this.dataSource.query(
      `
      SELECT id, name
      FROM consultant_companies
      WHERE id = $1
      LIMIT 1
      `,
      [companyId],
    );

    const company = baseRows[0];
    if (!company) {
      return null;
    }

    try {
      const detailRows = await this.dataSource.query(
        `
        SELECT qr_custom_enabled, qr_custom_url
        FROM consultant_companies
        WHERE id = $1
        LIMIT 1
        `,
        [companyId],
      );

      const details = detailRows[0] ?? {};
      return {
        ...company,
        qr_custom_enabled: details.qr_custom_enabled ?? null,
        qr_custom_url: details.qr_custom_url ?? null,
      };
    } catch (error) {
      return {
        ...company,
        qr_custom_enabled: null,
        qr_custom_url: null,
      };
    }
  }

  async fetchFwVersion(params: FetchFwVersionDto) {
    const { optic_number } = params;

    const devices = await this.deviceService.findDevices(
      {
        optic_number,
      },
      [
        'id',
        'optic_number',
        'serial_number',
        'docking_number',
        'wb',
        'cal',
        'refresh_date',
        'app_version',
        'app_update_date',
        'division',
        'use_yn',
        'lat',
        'lng',
        'fw_version',
      ],
      ['consultant_company', 'consultant_company.applications'],
    );
    const device = devices[0];

    if (!device) {
      this.commonService.throwNotFoundError();
    }

    return device;
  }

  async updateFwVersion(params: UpdateFwVersionDto) {
    const { optic_number, fw_version } = params;

    const device = await this.deviceService.findOneDevices({
      optic_number,
    });

    if (!device) {
      this.commonService.throwNotFoundError();
    }

    await this.deviceService.updateDevice(device.id, { fw_version: fw_version });

    return this.commonService.generateMessage('Success!');
  }

  async countriesList(filters: CountriesListDto) {
    const search = filters?.search ?? '';
    const countries = await this.countries.findCountry({
      name: ILike(`${search}%`),
    });
    return countries;
  }

  async basicDetails() {
    const [ethnicities, genders, skinColorGroups] = await Promise.all([
      this.ethnicities.findEthinicities(),
      this.genders.findGender(),
      this.skinColorGroups.findSkinColorGroups(),
    ]);

    return {
      ethnicities,
      genders,
      skin_color_groups: skinColorGroups,
    };
  }

  async loginSocial(LoginSocialDto: LoginSocialDto, company: string | null) {
    if (LoginSocialDto.social_provider === 'google') {
      const google = await this.google.getProfileByToken(LoginSocialDto);
      if (LoginSocialDto.app_type.toLocaleLowerCase() === 'b2b') {
        const consultant = await this.consultant.loginSocial(
          LoginSocialDto,
          google.email,
          null,
          company,
        );
        return consultant;
      } else if (LoginSocialDto.app_type.toLocaleLowerCase() === 'b2c') {
        const customer = await this.customer.socialLogin(
          LoginSocialDto,
          google.email,
          null,
          company,
        );
        return customer;
      }
    }
  }

  async logout(id: string) {
    const customer = await this.customersService.getCustomerById(id);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    }

    await this.customersService.updateCustomer(id, { token: null });

    const products = await this.productsService.findProduct({ customer_id: customer.id });

    if (products) {
      for (const product of products) {
        if (customer.email.includes('exampletest')) {
          await new Promise<void>(async (resolve) => {
            await this.productsService.updateProduct(product.id, {
              consultant_id: null,
              customer_id: null,
              use_date: null,
              use_time: null,
              mac_address: null,
              app_use_yn: 'N',
              first_use_date: null,
              days_remaining: Number(product.license_period),
              days_remaining_updated_at: new Date(),
            });
            resolve();
          });
        }

        if (customer.email.includes('@chowisas.com')) {
          await new Promise<void>(async (resolve, _) => {
            await this.productsService.updateProduct(product.id, {
              use_date: null,
              use_time: null,
              mac_address: null,
              app_use_yn: 'N',
            });
            resolve();
          });
        }
      }
    }

    return this.commonService.generateMessage('Success!');
  }

  private determineLink(
    consultantCompany: string,
    appName?: string | null,
    type?: string,
  ): string | null {
    // payload type 최우선 (레거시 명시)
    if (type) return type;

    const company = (consultantCompany ?? '').toLowerCase();
    const app = (appName ?? '').toLowerCase();

    const companyAppRules: Array<{ when: () => boolean; value: string }> = [
      {
        when: () =>
          (company.includes('innovasalus') && app.includes('germaine')) ||
          company.includes('gdc-hq'),
        value: 'germaine-de-capuccini',
      },
      { when: () => company.includes('olive'), value: 'olive-young' },
      { when: () => company.includes('rene'), value: 'rene-furterer' },
      {
        when: () =>
          company.includes('pierre') && (app.includes('pierrefabre') || app.includes('bella')),
        value: app.includes('skin') ? 'pierrefabre-skin' : 'pierrefabre-hair',
      },
    ];

    const match = companyAppRules.find((r) => r.when());
    return match?.value ?? null;
  }

  private encodeWebResult(
    batchId: number,
    customer_id: number | null,
    consultant_company_id: number,
    analysis: string,
    analysis_server_version: 'legacy' | 'integrated',
    app_id: number | null,
    analysis_output_type: 'skin_age' | 'health_score' | null,
    expires = false,
  ) {
    const payload = {
      b: batchId,
      c: customer_id,
      br: consultant_company_id,
      an: analysis,
      asv: analysis_server_version,
      ap: app_id,
      aot: analysis_output_type,
    };

    const secretKey = this.getRequiredEnv('WEB_RESULT_SECRET_KEY');

    const token = Jwt.sign(
      {
        data: zlib.deflateSync(JSON.stringify(payload)).toString('base64'),
      },
      secretKey,
      expires ? { algorithm: 'HS256', expiresIn: '2h' } : { algorithm: 'HS256' },
    );

    return Buffer.from(token).toString('base64');
  }

  async decodeWebResultToken(token: string) {
    const secretKey = this.getRequiredEnv('WEB_RESULT_SECRET_KEY');

    let verified: string | Jwt.JwtPayload;

    try {
      verified = Jwt.verify(Buffer.from(token, 'base64').toString(), secretKey, {
        ignoreExpiration: true,
      });
    } catch (error) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    if (typeof verified !== 'object' || !('data' in verified)) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const payload = JSON.parse(
      zlib.inflateSync(Buffer.from(verified.data as string, 'base64')).toString(),
    );

    const isExpired =
      typeof verified.exp === 'number' ? verified.exp < Math.floor(Date.now() / 1000) : false;

    return {
      batch_id: payload.b,
      customer_id: payload.c,
      brand_id: payload.br,
      analysis: payload.an,
      analysis_server_version: payload.asv ?? 'legacy',
      app_id: payload.ap,
      analysis_output_type: payload.aot ?? null,
      isExpired,
    };
  }

  private getBrandSettings(
    companyId: number,
    application?: { id?: number | string | null; name?: string | null } | null,
  ) {
    const config = resolveEmailBrandConfig({
      consultantCompanyId: companyId,
      appId: application?.id,
      appName: application?.name,
      fallbackKey: 'choicetech',
    });

    return {
      footerLogo: config.logos?.[companyId] ?? config.logos?.default,
      emailProvider: config.emailProvider,
      contact: config.contact,
      brandName: config.displayName ?? 'ChoiceTech',
    };
  }

  private getUnifiedBaseUrl(appId: number): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const chowisApps = [44, 53, 40, 41];
    const choicedxApps = [137, 138, 139, 140, 141];

    if (chowisApps.includes(appId)) {
      return isProduction
        ? this.getRequiredEnv('CHOWIS_WEB_RESULT_LINK')
        : 'https://example.com/result-staging';
    }

    if (choicedxApps.includes(appId)) {
      return isProduction
        ? this.getRequiredEnv('CHOICETECH_WEB_RESULT_LINK')
        : 'https://example.com/result-staging';
    }
    return process.env.UNIFIED_WEB_RESULT_LINK ?? 'https://example.com/result';
  }

  private async buildWebResultLink(
    data: ShareWebResultDto,
    consultant_id: number | null,
    tokenConsultantCompanyId: number | string | null,
    options: {
      mode: 'email' | 'qr';
    },
  ): Promise<string> {
    const {
      app_id,
      locale = 'en',
      type,
      analysis,
      analysis_server_version,
      batchId,
      customer_id,
      consultant_company_id,
      analysis_output_type = 'health_score',
      webresult_base_url,
    } = data;

    const parsedConsultantId = Number(consultant_id);
    const parsedCustomerId = Number(customer_id);
    const parsedAppId = Number(app_id);
    const normalizedCustomerId =
      Number.isFinite(parsedCustomerId) && parsedCustomerId > 0 ? parsedCustomerId : null;
    const normalizedAppId =
      Number.isFinite(parsedAppId) && parsedAppId > 0 ? parsedAppId : null;
    const consultant =
      Number.isFinite(parsedConsultantId) && parsedConsultantId > 0
        ? await this.findShareResultConsultant(parsedConsultantId)
        : null;
    const customer =
      normalizedCustomerId !== null
        ? await this.findShareResultCustomer(normalizedCustomerId)
        : null;

    const application =
      (normalizedAppId !== null ? await this.findShareResultApplication(normalizedAppId) : null) ??
      (Number.isFinite(Number(consultant?.app_id))
        ? await this.findShareResultApplication(Number(consultant?.app_id))
        : null);
    const applicationName = application?.name ?? 'ChoiceTech';
    const parsedRequestCompanyId = Number(consultant_company_id);
    const parsedTokenCompanyId = Number(tokenConsultantCompanyId);
    const consultantCompanyId = Number(
      (Number.isFinite(parsedRequestCompanyId) && parsedRequestCompanyId > 0
        ? parsedRequestCompanyId
        : Number.isFinite(parsedTokenCompanyId) && parsedTokenCompanyId > 0
        ? parsedTokenCompanyId
        : consultant?.consultant_company_id) ??
        application?.consultant_company_id ??
        1,
    );
    const consultantCompany = await this.findShareResultCompany(consultantCompanyId);

    const analysisForToken = analysis ?? type ?? 'default';
    const analysisServerVersion = analysis_server_version ?? 'legacy';
    const webResultPayload = {
      batchId: Number(batchId),
      customer_id: customer?.id ? Number(customer.id) : normalizedCustomerId,
      consultant_company_id: consultantCompanyId,
      analysis: analysisForToken,
      analysis_server_version: analysisServerVersion,
      app_id: normalizedAppId,
      analysis_output_type,
      expires: options.mode === 'qr',
    };

    const encodedWebResult = this.encodeWebResult(
      webResultPayload.batchId,
      webResultPayload.customer_id,
      webResultPayload.consultant_company_id,
      webResultPayload.analysis,
      webResultPayload.analysis_server_version,
      webResultPayload.app_id,
      webResultPayload.analysis_output_type,
      webResultPayload.expires,
    );

    const lang = locale ?? 'en';

    /*Custom QR 분기 (QR 모드에서만 적용)*/
    if (
      options.mode === 'qr' &&
      consultantCompany?.qr_custom_enabled === true &&
      consultantCompany?.qr_custom_url
    ) {
      const base = consultantCompany.qr_custom_url.replace(/\/$/, '');

      // 완전 단일 URL 반환
      return base;
    }

    /*기존 레거시 판단 로직 (변경 없음)*/
    const legacyPath = this.determineLink(consultantCompany?.name ?? '', applicationName, type);

    const LEGACY_COMPANY_PATHS = new Set<string>([
      'germaine-de-capuccini',
      'olive-young',
      'rene-furterer',
      'pierrefabre-hair',
      'pierrefabre-skin',
    ]);

    const useLegacy = legacyPath && LEGACY_COMPANY_PATHS.has(legacyPath);

    /**
     * 신규 통합 URL (default)
     */
    if (!useLegacy) {
      const unifiedBaseUrl = this.getUnifiedBaseUrl(normalizedAppId ?? 0);
      return `${unifiedBaseUrl}/${lang}/${encodedWebResult}`;
    }

    /**
     * 레거시 URL (회사별 경로 유지)
     */
    const baseUrlMap =
      options.mode === 'qr'
        ? {
            chowis: this.getRequiredEnv('CHOWIS_WEB_RESULT_LINK'),
            choicetech: this.getRequiredEnv('CHOICETECH_WEB_RESULT_LINK'),
            dxself: this.getRequiredEnv('DXSELF_WEB_RESULT_LINK'),
          }
        : {
            chowis: this.getRequiredEnv('CHOWIS_WEB_RESULT_LINK'),
            choicetech: this.getRequiredEnv('CHOICETECH_WEB_RESULT_LINK'),
          };

    const baseUrl =
      baseUrlMap[webresult_base_url as keyof typeof baseUrlMap] ??
      this.getRequiredEnv('CHOWIS_WEB_RESULT_LINK');

    if (options.mode === 'qr' && webresult_base_url === 'dxself') {
      return `${baseUrl}/${lang}/${encodedWebResult}`;
    }

    return `${baseUrl}/${lang}/${legacyPath}/${encodedWebResult}`;
  }

  async webResultSending(
    data: ShareWebResultDto,
    consultant_id: number | null,
    tokenConsultantCompanyId: number | string | null,
  ) {
    const { email, locale = 'en', batchId, customer_id, app_id, consultant_company_id } = data;

    const resultLink = await this.buildWebResultLink(
      data,
      consultant_id,
      tokenConsultantCompanyId,
      {
        mode: 'email',
      },
    );

    const parsedConsultantId = Number(consultant_id);
    const parsedCustomerId = Number(customer_id);
    const parsedAppId = Number(app_id);
    const normalizedCustomerId =
      Number.isFinite(parsedCustomerId) && parsedCustomerId > 0 ? parsedCustomerId : null;
    const normalizedAppId =
      Number.isFinite(parsedAppId) && parsedAppId > 0 ? parsedAppId : null;
    const consultant =
      Number.isFinite(parsedConsultantId) && parsedConsultantId > 0
        ? await this.findShareResultConsultant(parsedConsultantId)
        : null;
    const customer =
      normalizedCustomerId !== null
        ? await this.findShareResultCustomer(normalizedCustomerId)
        : null;

    const application =
      (normalizedAppId !== null ? await this.findShareResultApplication(normalizedAppId) : null) ??
      (Number.isFinite(Number(consultant?.app_id))
        ? await this.findShareResultApplication(Number(consultant?.app_id))
        : null);
    const applicationName = application?.name ?? 'ChoiceTech';
    const parsedRequestCompanyId = Number(consultant_company_id);
    const parsedTokenCompanyId = Number(tokenConsultantCompanyId);
    const consultantCompanyId = Number(
      (Number.isFinite(parsedRequestCompanyId) && parsedRequestCompanyId > 0
        ? parsedRequestCompanyId
        : Number.isFinite(parsedTokenCompanyId) && parsedTokenCompanyId > 0
        ? parsedTokenCompanyId
        : consultant?.consultant_company_id) ??
        application?.consultant_company_id ??
        1,
    );

    const fullName = customer ? this.formatCustomerDisplayName(customer, locale) : '';
    const customerName = fullName && fullName !== '' ? fullName : customer?.name || 'Customer';

    const { footerLogo, emailProvider, contact } = this.getBrandSettings(
      consultantCompanyId,
      application,
    );

    const logoUrl = this.resolveShareResultLogoUrl(application?.icon, footerLogo);

    const isAlfaparf = [302, 303, 304, 305].includes(Number(consultantCompanyId));

    const brandConfig = this.mailDispatchService.resolveBrandConfig({
      consultantCompanyId,
      appId: application?.id,
      appName: applicationName,
      emailProvider,
      fallbackKey: 'choicetech',
    });

    const { subject, templateContext } = this.mailTemplateService.buildWebResultTemplate({
      locale,
      brandConfig,
      customerName,
      appName: applicationName,
      resultLink,
      type: data.type,
      logoUrl,
      footerLogo,
      contact,
      isAlfaparf,
    });

    const recipientEmail = email ?? customer?.email;
    if (!recipientEmail) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    try {
      await this.mailDispatchService.sendBrandedEmail({
        to: recipientEmail,
        subject,
        templateName: 'web-result',
        templateContext,
        emailProvider,
        appId: application?.id,
        appName: applicationName,
      });

      if (customer?.id && consultant?.id) {
        const existing = await this.webResult.findOneWebResultbatchCustomer(
          Number(batchId),
          customer.id,
        );

        if (!existing) {
          await this.webResult.saveWebResult({
            batch_id: batchId,
            app_id: consultant.app_id,
            customer_id: customer.id,
            consultant_id: consultant.id,
            web_link: resultLink,
          });
        }
      }

      return { success: true };
    } catch (error) {
      return null;
    }
  }

  async generateWebResultQrCode(
    data: ShareWebResultDto,
    consultant_id: number | null,
    tokenConsultantCompanyId: number | string | null,
  ) {
    return this.buildWebResultLink(data, consultant_id, tokenConsultantCompanyId, {
      mode: 'qr',
    });
  }

  async generateQrCode(url: string) {
    return QRCode.toBuffer(url, {
      type: 'png',
      width: 480,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }

  async generateToken(data: any) {
    const payload = { serviceId: data.serviceId, user: data.serviceName };

    const serviceList = [
      {
        id: 'W3TZ6SRfFh',
        name: 'dermochoice',
      },
      {
        id: 'aI2gXVus5m',
        name: 'web-result',
      },
    ];

    const isValidPair = serviceList.some(
      (service) => service.id === data.serviceId && service.name === data.serviceName,
    );

    if (!isValidPair) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const secretKey = this.getRequiredEnv('CRM_ACCESS_TOKEN_SECRET');
    const token = Jwt.sign(payload, secretKey, { expiresIn: '24h', algorithm: 'HS256' });
    return token;
  }
}
