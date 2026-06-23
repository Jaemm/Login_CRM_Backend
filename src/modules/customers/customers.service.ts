import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsSelectByString, In, Like } from 'typeorm';
import { TokenTypeEnum } from 'src/jwt/enums/auth-token.enum';

import { Customers } from '@/src/common/entities/crmEntities/Customers.entity';
import { AuthService } from '../auth/auth.service';
import { JwtService } from 'src/jwt/jwt.service';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';
import {
  AllLicenseDto,
  CalculatePriceDto,
  ChangePasswordCustomerDto,
  CustomerChangeLicenseDto,
  NotifySalesChangeLicenseDto,
  UpdateCustomersDto,
  PresignedUploadDto,
  ResendConfirmationDto,
  PasswordDto,
  DeleteCustomerDto,
  RenewDevicesDto,
  UpdateLicenseDto,
} from '@/src/modules/customers/customers.dto';
import { ConsultantCompanyService } from '../consultantCompany/consultantCompany.service';
import { DeviceService } from '../devices/devices.service';
import { IMessage } from 'src/common/interfaces/message.interface';
import { CommonService } from 'src/common/common.service';
import { BrevoService } from 'src/common/brevo.service';
import { ErrorExceptionFactory } from 'src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { MailDispatchService } from 'src/common/mail-dispatch.service';
import { MailTemplateService } from 'src/common/mail-template.service';
import { TemplateRenderService } from 'src/common/template-render.service';
import { LicenseDomainService } from 'src/common/license-domain.service';
import { ActiveStorageService } from '../activeStorage/activeStorage.service';
import { ConsultantsService } from '../consultants/consultants.service';
import { ConsultantShopsService } from '../consultantShops/consultantShops.service';
import { ConsultantPositionsService } from '../consultantPositions/consultantPositions.service';
import { GendersService } from '../genders/genders.service';
import { ApplicationsService } from '../applications/applications.service';
import { CountriesService } from '../countries/countries.service';
import { EthinicitiesService } from '../ethinicities/ethinicities.service';
import { SkinColorGroupsService } from '../skinColorGroups/skinColorGroups.service';
import { CustomerLog } from '@/src/common/entities/crmEntities/CustomerLog.entity';
import { ProductsService } from '../products/products.service';
import { ChowisCustomerConsents } from '@/src/common/entities/crmEntities/ChowisCustomerConsents.entity';
import { CustomerApplications } from '@/src/common/entities/crmEntities/CustomerApplications.entity';
import { CustomerPrivacyRequests } from '@/src/common/entities/crmEntities/CustomerPrivacyRequests.entity';
import { ChowisCustomerConsentHistories } from '@/src/common/entities/crmEntities/ChowisCustomerConsentHistories.entity';
import { ProductsMultiConnect } from '@/src/common/entities/crmEntities/ProductsMultiConnect.entity';
import { Role } from '@/src/common/enums/role.enum';
import { UpdateCrmCustomersDto } from '../crm/crm.dto';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ConfirmHtmlDto, LoginSocialDto } from '../consultants/consultants.dto';
import { IJwt } from '@/src/config/interfaces/jwt.interfaces';
import { resolveEmailBrandConfig } from '@/src/config';
import { Notifications } from '@/src/common/entities/crmEntities/Notifications.entity';
import { WebResultManagement } from '@/src/common/entities/crmEntities/WebResultManagement.entity';
import { LicenceService } from '../licence/licence.service';
import { Devices } from '@/src/common/entities/crmEntities/Devices.entity';
import { TargetType } from '@/src/common/enums/target-type.enum';
import { LicenseType } from '@/src/common/enums/license-type.enum';
import { redactSensitiveValue } from '@/src/common/utils/privacy-redaction';
const CUSTOMER_RESPONSE_FIELD_ORDER = [
  'id',
  'company_id',
  'consultant_id',
  'token',
  'refresh_token',
  'email',
  'social',
  'name',
  'surname',
  'phone',
  'os',
  'language',
  'address',
  'city',
  'state',
  'zip_code',
  'notes',
  'push_token',
  'app_id',
  'skin_color_group_id',
  'ethnicity_id',
  'gender',
  'gender_id',
  'country_id',
  'country',
  'country_details',
  'birth',
  'image_url',
  'sign_in_count',
  'optic_number',
  'consultant_name',
  'products',
  'consultant',
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
export class CustomersService {
  private readonly jwtConfig: IJwt;
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectRepository(Customers)
    private readonly CustomersRepository: Repository<Customers>,
    @InjectRepository(CustomerLog)
    private readonly customerLogRepository: Repository<CustomerLog>,
    @InjectRepository(Notifications)
    private readonly notificationRepository: Repository<Notifications>,
    @InjectRepository(CustomerApplications)
    private readonly customerApplicationsRepository: Repository<CustomerApplications>,
    @InjectRepository(WebResultManagement)
    private readonly webResultManagementRepository: Repository<WebResultManagement>,
    @InjectRepository(CustomerPrivacyRequests)
    private readonly customerPrivacyRequestsRepository: Repository<CustomerPrivacyRequests>,
    @InjectRepository(ChowisCustomerConsents)
    private readonly chowisCustomerConsentRepository: Repository<ChowisCustomerConsents>,
    @InjectRepository(ChowisCustomerConsentHistories)
    private readonly chowisCustomerConsentHistoriesRepository: Repository<ChowisCustomerConsentHistories>,
    @InjectRepository(ProductsMultiConnect)
    private readonly productsMultiConnectRepository: Repository<ProductsMultiConnect>,

    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly devices: DeviceService,
    private readonly commonService: CommonService,
    private readonly mailDispatchService: MailDispatchService,
    private readonly mailTemplateService: MailTemplateService,
    private readonly templateRenderService: TemplateRenderService,
    private readonly licenseDomainService: LicenseDomainService,
    private readonly brevoService: BrevoService,
    private readonly activeStorageService: ActiveStorageService,
    private readonly companies: ConsultantCompanyService,
    @Inject(forwardRef(() => ConsultantsService)) private readonly consultant: ConsultantsService,
    private readonly consultantShops: ConsultantShopsService,
    private readonly consultantPositions: ConsultantPositionsService,
    private readonly genders: GendersService,
    private readonly applications: ApplicationsService,
    private readonly countries: CountriesService,
    private readonly ethnicities: EthinicitiesService,
    private readonly skinColorGroups: SkinColorGroupsService,
    private readonly licenceService: LicenceService,
    @Inject(forwardRef(() => ProductsService)) private readonly productService: ProductsService,
  ) {}

  private getPrivacyRequestRetentionDays(): number {
    const fallbackDays = 365;
    const rawValue = process.env.GDPR_PRIVACY_REQUEST_RETENTION_DAYS;
    const parsedValue = rawValue ? Number(rawValue) : fallbackDays;

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return fallbackDays;
    }

    return Math.floor(parsedValue);
  }

  private getPrivacyRequestRetentionCutoff(): Date {
    const retentionDays = this.getPrivacyRequestRetentionDays();
    return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  }

  private async deleteBrevoCustomerContact(email?: string | null) {
    const normalizedEmail = email?.trim();
    if (!normalizedEmail) {
      return;
    }

    try {
      await this.brevoService.deleteContact(normalizedEmail);
    } catch (error) {
      this.logger.warn(
        `[Brevo customer delete failed] email=${normalizedEmail} ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async normalizeCustomerResponse(
    customer: any,
    options?: { accessToken?: string; refreshToken?: string },
  ) {
    const normalizedCustomer = customer;
    normalizedCustomer.products = normalizedCustomer.products ?? [];

    normalizedCustomer.products.forEach((product: any) => {
      const expiryMeta = this.licenseDomainService.resolveExpiryMeta({
        firstUseDate: product.first_use_date,
        licensePeriod: product.license_period,
        licenseName: product.license?.name,
      });
      product.expired_date = expiryMeta.expiredDate;
      product.is_expired = expiryMeta.isExpired;

      if (product.device?.consultant_company?.applications) {
        product.device.consultant_company.applications = [];
      }
    });

    normalizedCustomer.country_details = normalizedCustomer?.country ?? {};
    normalizedCustomer.country = normalizedCustomer?.country
      ? normalizedCustomer?.country['name'] ?? normalizedCustomer.country
      : '';
    normalizedCustomer.gender =
      normalizedCustomer?.gender?.id ??
      normalizedCustomer?.gender_id ??
      normalizedCustomer?.gender ??
      null;
    normalizedCustomer.optic_number = normalizedCustomer?.getOpticNumbers ?? [];
    normalizedCustomer.consultant_name = normalizedCustomer?.getConsultantName ?? '';

    if (options?.accessToken) {
      normalizedCustomer.token = options.accessToken;
    }

    if (options?.refreshToken) {
      normalizedCustomer.refresh_token = options.refreshToken;
    }

    return orderResponseFields(normalizedCustomer, CUSTOMER_RESPONSE_FIELD_ORDER);
  }

  public async getAllLicense(customerId: number, data: AllLicenseDto) {
    const { application_id, optic_number } = data;

    const device = await this.devices.findOneDevices({ optic_number });
    if (!device) {
      this.commonService.throwNotFoundError();
    }

    const product = await this.productService.findOneProduct({
      device_id: device.id,
      application_id,
      customer_id: customerId,
    });
    if (!product) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    const licenses = await this.licenceService.findLicence({ id: product.license_id });
    if (!licenses) {
      this.commonService.throwNotFoundError();
    }

    return { data: licenses };
  }

  public async changeLicense(customerId: number, data: CustomerChangeLicenseDto) {
    const { optic_number, license_id, app_id } = data;

    const [licenses, devices] = await Promise.all([
      this.licenceService.findLicence({ id: license_id }),
      this.devices.findDevices({ optic_number }),
    ]);

    if (!licenses || !devices.length) {
      this.commonService.throwNotFoundError();
    }

    const deviceIds = devices.map((device: Devices) => Number(device.id));
    const products = await this.productService.findProduct({
      device_id: In(deviceIds),
      customer_id: customerId,
      application_id: Number(app_id),
    });

    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    const productIdsToUpdate = products
      .filter((product) => String(product.license_id) !== String(licenses[0]?.id))
      .map((product) => product.id);

    if (!productIdsToUpdate.length) {
      return this.commonService.generateMessage('License changed successfully');
    }

    const updateResult = await this.productService.updateProducts(
      { id: In(productIdsToUpdate), customer_id: customerId },
      {
        license_id: String(licenses[0].id),
      },
    );

    if (!updateResult.affected) {
      this.commonService.throwNotFoundError();
    }

    return this.commonService.generateMessage('License changed successfully');
  }

  public async notifySalesChangeLicense(customerId: number, data: NotifySalesChangeLicenseDto) {
    const { optic_number, license_id } = data;

    const customer = await this.getCustomer(
      { id: customerId },
      ['id', 'gdpr_processing_restricted'],
    );
    if (customer?.gdpr_processing_restricted) {
      this.logger.warn(
        `[notifySalesChangeLicense skipped] customer_id=${customerId} GDPR processing restricted`,
      );
      return this.commonService.generateMessage('Notification skipped due to privacy restriction');
    }

    const [licenses, devices] = await Promise.all([
      this.licenceService.findLicence({ id: license_id }),
      this.devices.findDevices({ optic_number }),
    ]);

    if (!licenses || !devices.length) {
      this.commonService.throwNotFoundError();
    }

    const deviceIds = devices.map((device: Devices) => Number(device.id));
    const products = await this.productService.findProduct({
      device_id: In(deviceIds),
      customer_id: customerId,
    });

    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    const notification = this.notificationRepository.create({
      target_type: TargetType.Customer,
      target_id: String(customerId),
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

  public async calculatePrice(customerId: number, data: CalculatePriceDto) {
    const { duration, license_id, optic_number, selection_type, time_type } = data;
    let cost = 0;

    let deviceIds = await this.devices.findDevices({ optic_number: In(optic_number.split(',')) }, [
      'id',
    ]);
    deviceIds = deviceIds.map((d: { id: string }) => Number(d.id));

    const products = await this.productService.findProduct({
      device_id: In(deviceIds),
      customer_id: customerId,
    });
    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    switch (selection_type) {
      case 'change':
        for (const product of products) {
          const remaining = this.consultant.daysLeftFromExpired(
            Number(product.license_period),
            product.first_use_date,
          );
          if (remaining < 1) {
            throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
          }

          cost += await this.consultant.newChangeLicenseCost(
            license_id,
            product.license_id,
            Number(product.application_id),
            product.first_use_date,
            Number(product.id),
            product.license_period,
            product.license_remaining_days,
          );
        }
        break;

      case 'extend':
        if (!duration || !time_type) {
          throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
        }

        for (const product of products) {
          cost += await this.consultant.extendLicenseCost(
            Number(product.license_id),
            Number(duration),
            time_type,
            Number(product.application_id),
          );
        }
        break;

      default:
        throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    return { message: 'Success', total_cost: cost.toFixed(2) };
  }

  public async updateLicense(customerId: number, data: UpdateLicenseDto) {
    const { optic_number, duration, time_type } = data;

    const device = await this.devices.findOneDevices({ optic_number });
    const product = device
      ? await this.productService.findOneProduct({ device_id: device.id, customer_id: customerId })
      : null;

    if (!device || !product) {
      this.commonService.throwNotFoundError();
    }

    const additionalDays = this.getAdditionalDays(duration, time_type);
    const newProduct = await this.productService.updateProduct(product.id, {
      license_period: Number(product.license_period ?? 0) + additionalDays,
      license_remaining_days: this.licenseDomainService.remainingDaysFromPeriod(
        Number(product.license_period ?? 0) + additionalDays,
        product.first_use_date,
      ),
      days_remaining_updated_at: new Date(),
    });

    if (newProduct.affected < 1) {
      this.commonService.throwNotFoundError();
    }

    await this.licenceService.createLicenceHistory({
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
    });

    return this.commonService.generateMessage('License updated successfully');
  }

  public async renewDevices(customerId: number, data: RenewDevicesDto) {
    const { optic_numbers, duration, time_type, submit_license_extension } = data;

    if (submit_license_extension !== 'true') {
      return this.commonService.generateMessage('Success!');
    }

    const additionalDays = this.getAdditionalDays(duration, time_type);
    if (additionalDays > 1095) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
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
    const products = await this.productService.findProduct({
      device_id: In(deviceIds),
      customer_id: customerId,
    });

    if (!products.length) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    const exceedingProduct = products.find(
      (product) => Number(product.license_period ?? 0) + additionalDays > 1095,
    );
    if (exceedingProduct) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    const updateResults = await Promise.all(
      products.map((product) =>
        this.productService.updateProduct(product.id, {
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
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    }
    return additionalDays;
  }

  toDatabaseFormat(date: string | null): string | null {
    if (!date) return null;
    return date.replace(/-/g, '');
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
    return storedHash.startsWith('$2a$') ? 'bcrypt' : 'argon2';
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

  async insertCustomer(customer: Customers) {
    const newCustomer = this.CustomersRepository.create(customer);
    const result = await this.CustomersRepository.save(newCustomer);
    return result;
  }

  async createCrmCustomer(customer: any) {
    const result = await this.CustomersRepository.save(customer);
    return result;
  }

  async getCustomer(conditions: any, selections?: string[], includes?: string[]) {
    const customer: any = await this.CustomersRepository.findOne({
      where: conditions,
      select: selections
        ? (selections as FindOptionsSelectByString<Customers>)
        : ['id', 'name', 'email', 'phone', 'app_id', 'consultant_id'],
      relations: includes ? includes : [],
    });

    return customer;
  }

  async getCustomers(
    conditions: any,
    selections?: string[],
    includes?: string[],
    search?: string,
    page?: number,
    per?: number,
  ) {
    if (!page) page = 1;
    if (!per) per = 10;
    const skip = (page - 1) * per;

    if (search) {
      conditions = {
        ...conditions,
        name: Like(`%${search}%`),
      };
    }

    const customers: any = await this.CustomersRepository.find({
      where: conditions,
      select: selections
        ? (selections as FindOptionsSelectByString<Customers>)
        : ['id', 'name', 'email', 'app_id'],
      relations: includes ? includes : [],
      take: per,
      skip: skip,
    });

    return customers;
  }

  async getCustomersByConsultant(
    conditions: any,
    selections?: any,
    search?: string,
    page?: number,
    perPage?: number,
    includes?: string[],
  ) {
    // 페이지네이션 기본값 설정
    if (!page) page = 1;
    if (!perPage) perPage = 20;

    // OFFSET 계산 (TypeORM skip 용)
    const skip = (page - 1) * perPage;

    /**
     * consultant_id 가 단일 숫자로 들어온 경우
     * → CRM Sync 여부에 따라 조회 범위를 확장할지 결정
     */
    if (typeof conditions.consultant_id === 'number') {
      // 컨설턴트의 CRM Sync 여부 및 소속 회사 조회
      const result = await this.CustomersRepository.query(`
      SELECT cc.is_crm_sync, c.consultant_company_id
      FROM consultants c
      JOIN consultant_companies cc ON c.consultant_company_id = cc.id
      WHERE c.id = ${conditions.consultant_id}
    `);

      /**
       * CRM Sync 가 활성화된 회사라면
       * → 같은 회사에 속한 모든 consultant의 고객을 조회
       */
      if (result?.[0]?.is_crm_sync) {
        // 같은 consultant_company_id 를 가진 consultant 전체 조회
        const all = await this.CustomersRepository.query(`
        SELECT id FROM consultants WHERE consultant_company_id = ${result[0].consultant_company_id}
      `);

        // consultant_id 조건을 IN (...) 형태로 변환
        const ids = all.map((c: { id: number }) => c.id);
        conditions.consultant_id = In(ids);
      } else {
        /**
         * CRM Sync 가 비활성화된 경우
         * → 자기 자신의 consultant_id 만 조회
         */
        conditions.consultant_id = In([conditions.consultant_id]);
      }
    }

    /**
     * 검색어(search)가 있는 경우
     * email / name / surname 중 하나라도 포함되면 매칭
     */
    const where = search
      ? [
          { email: Like(`%${search}%`) },
          { name: Like(`%${search}%`) },
          { surname: Like(`%${search}%`) },
        ]
      : {};

    /**
     * search 가 존재하면
     * 기존 conditions 에 OR 조건(where 배열)을 병합
     */
    if (search) {
      conditions = {
        ...conditions,
        where,
      };
    }

    // 전체 데이터 수 조회 (페이지네이션용)
    const total_size = await this.CustomersRepository.count({
      where: conditions,
    });

    // 전체 페이지 수 계산
    const total_pages = Math.ceil(total_size / perPage);

    /**
     * 실제 고객 데이터 조회
     * - select: 필요한 컬럼만 조회
     * - take / skip: 페이지네이션
     * - relations: country 등 relation 로딩
     */
    const [data, current_page_size] = await this.CustomersRepository.findAndCount({
      where: conditions,
      select: selections
        ? (selections as FindOptionsSelectByString<Customers>)
        : ['id', 'name', 'email', 'app_id'],
      take: perPage,
      skip: skip,
      relations: includes ? includes : [],
    });

    /**
     * 조회 결과 후처리
     * - 프론트에서 바로 쓰기 좋게 필드 가공
     */
    data.forEach((customer: any) => {
      // country relation → 국가명으로 변환
      customer.country = customer.getCountryName;

      // gender_id 를 gender 로 치환
      customer.gender = customer.gender_id;

      // email_confirmed boolean 보정
      customer.email_confirmed = customer.email_confirmed === true ? true : false;

      // register_date 가 없으면 created_at 사용
      customer.register_date =
        customer.register_date === null ? customer.created_at : customer.register_date;

      // birth 날짜 포맷 변환
      customer.birth = customer?.birth !== null ? this.toDatabaseFormat(customer.birth) : null;

      // 응답에 불필요한 필드 제거
      delete customer.created_at;
      delete customer.gender_id;
      delete customer.perPage;
    });

    // 페이지네이션 메타 정보 포함하여 반환
    return {
      data,
      total_size,
      current_page_size,
      current_page: page,
      total_pages,
      perPage,
    };
  }

  async getConsultantScopedCustomerIds(consultantId: number): Promise<number[]> {
    if (!consultantId || Number.isNaN(consultantId)) {
      return [];
    }

    const consultantRows = await this.CustomersRepository.query(
      `
      SELECT c.id, cc.is_crm_sync, c.consultant_company_id
      FROM consultants c
      JOIN consultant_companies cc ON c.consultant_company_id = cc.id
      WHERE c.id = $1
      LIMIT 1
      `,
      [consultantId],
    );

    const consultant = consultantRows?.[0];
    if (!consultant) {
      return [];
    }

    const scopedConsultantIds = consultant.is_crm_sync
      ? (
          await this.CustomersRepository.query(
            `
            SELECT id
            FROM consultants
            WHERE consultant_company_id = $1
            `,
            [consultant.consultant_company_id],
          )
        ).map((row: { id: number | string }) => Number(row.id))
      : [consultantId];

    const normalizedConsultantIds = scopedConsultantIds.filter((id: number) => Number.isFinite(id));
    if (!normalizedConsultantIds.length) {
      return [];
    }

    const scopedCustomers = await this.CustomersRepository.find({
      select: {
        id: true,
      },
      where: {
        consultant_id: In(normalizedConsultantIds),
      },
    });

    return scopedCustomers
      .map((customer) => Number(customer.id))
      .filter((customerId) => Number.isFinite(customerId));
  }

  async getCustomerById(id: string) {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'notes',
      'push_token',
      'app_id',
      'company_id',
      'consultant_id',
      'skin_color_group_id',
      'ethnicity_id',
      'gender_id',
      'sign_in_count',
      'image_url',
      'country_id',
      'birth',
      'token',
      'social',
      'password_digest',
      'email_confirmed',
    ];
    const customer: any = await this.getCustomer({ id: id }, selections);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus(
        'notFound',
        ErrorStatus.CUSTOMER_NOT_FOUND,
        undefined,
      );
    }
    return customer;
  }

  async exportCustomerData(id: string) {
    const customer: any = await this.getCustomer(
      { id },
      [
        'id',
        'email',
        'name',
        'surname',
        'os',
        'language',
        'phone',
        'phone_country_code',
        'address',
        'city',
        'state',
        'zip_code',
        'notes',
        'push_token',
        'app_id',
        'company_id',
        'consultant_id',
        'skin_color_group_id',
        'ethnicity_id',
        'gender_id',
        'sign_in_count',
        'image_url',
        'country_id',
        'birth',
        'register_date',
        'social',
        'email_confirmed',
        'gdpr_processing_restricted',
        'gdpr_processing_restricted_at',
        'gdpr_processing_restriction_reason',
        'created_at',
        'updated_at',
      ],
      [
        'country',
        'ethnicity',
        'skinColorGroup',
        'gender',
        'consultant',
        'products',
        'products.device',
        'products.license',
        'customerApplications',
        'chowisCustomerConsents',
      ],
    );

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus(
        'notFound',
        ErrorStatus.CUSTOMER_NOT_FOUND,
        undefined,
      );
    }

    const profile = {
      ...customer,
      country: customer?.country?.name ?? null,
      country_details: customer?.country ?? null,
      consultant_name: customer?.consultant?.name ?? null,
      email_confirmed: customer?.email_confirmed === true,
      products: (customer.products ?? []).map((product: any) => ({
        id: product.id,
        device_id: product.device_id ?? null,
        optic_number: product?.device?.optic_number ?? null,
        application_id: product.application_id ?? null,
        license_id: product.license_id ?? null,
        license_name: product?.license?.name ?? null,
        first_use_date: product.first_use_date ?? null,
        license_period: product.license_period ?? null,
        created_at: product.created_at ?? null,
        updated_at: product.updated_at ?? null,
      })),
      customerApplications: (customer.customerApplications ?? []).map((item: any) => ({
        id: item.id,
        application_id: item.applicationId ?? null,
        created_at: item.createdAt ?? null,
        updated_at: item.updatedAt ?? null,
      })),
      chowisCustomerConsents: (customer.chowisCustomerConsents ?? []).map((consent: any) => ({
        id: consent.id,
        consent_type: consent.consentType ?? null,
        consent_version: consent.consentVersion ?? null,
        consent_text: consent.consentText ?? null,
        consent_form_answers: consent.consentFormAnswers ?? null,
        data_transfer: consent.dataTransfer ?? null,
        data_privacy: consent.dataPrivacy ?? null,
        receive_license_notification: consent.receiveLicenseNotification ?? null,
        receive_newsletter: consent.receiveNewsletter ?? null,
        additional_information: consent.additionalInformation ?? null,
        consultant_id: consent.consultant_id ?? null,
        withdrawn_at: consent.withdrawnAt ?? null,
        withdrawal_reason: consent.withdrawalReason ?? null,
        created_at: consent.createdAt ?? null,
        updated_at: consent.updatedAt ?? null,
      })),
    } as any;

    delete profile.password_digest;
    delete profile.recovery_password_digest;
    delete profile.confirm_token;
    delete profile.delete_token;
    delete profile.token;
    delete profile.refresh_token;

    const customerLogs = await this.customerLogRepository.find({
      where: { customer_id: Number(id) },
      select: ['id', 'action_type', 'consultant_id', 'customer_id', 'app_id', 'reason', 'created_at', 'updated_at'],
      order: { created_at: 'DESC' },
    });

    const notifications = await this.notificationRepository.find({
      where: { target_type: TargetType.Customer, target_id: String(id) },
      select: ['id', 'target_type', 'target_id', 'kind', 'title', 'content', 'created_at', 'updated_at'],
      order: { created_at: 'DESC' },
    });

    return {
      profile,
      customer_logs: customerLogs,
      notifications,
    };
  }

  async createPrivacyRequest(
    customerId: string,
    data: { request_type: string; reason?: string; payload?: Record<string, any> },
  ) {
    const customer = await this.getCustomer({ id: customerId }, ['id', 'email', 'name', 'surname']);
    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus(
        'notFound',
        ErrorStatus.CUSTOMER_NOT_FOUND,
        undefined,
      );
    }

    const allowedTypes = new Set(['access', 'rectification', 'erasure', 'restriction', 'objection', 'portability']);
    if (!allowedTypes.has(data.request_type)) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const request = this.customerPrivacyRequestsRepository.create({
      customer_id: Number(customerId),
      request_type: data.request_type,
      status: 'pending',
      reason: data.reason ?? null,
      payload: {
        ...((data.payload ?? {}) as Record<string, any>),
        customer: {
          id: customer.id,
          email: customer.email ?? null,
          name: customer.name ?? null,
          surname: customer.surname ?? null,
        },
      },
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await this.customerPrivacyRequestsRepository.save(request);

    const consultantId = customer.consultant_id ? Number(customer.consultant_id) : null;
    if (consultantId) {
      const notification = this.notificationRepository.create({
        target_type: TargetType.Consultant,
        target_id: String(consultantId),
        message_id: String(saved.id),
        kind: 'privacy-request-created',
        title: 'New privacy request received',
        content: `Customer ${customer.id} submitted a GDPR privacy request (${data.request_type}).`,
        created_at: new Date(),
        updated_at: new Date(),
        fcmSent: false,
      });

      try {
        await this.notificationRepository.save(notification);
      } catch (error) {
        this.logger.warn(
          `[privacy request consultant notification failed] request_id=${saved.id} ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    const opsRecipient = process.env.PRIVACY_REQUEST_NOTIFICATION_EMAIL?.trim();
    if (opsRecipient) {
      try {
        const createdAt = new Date().toISOString();
        await this.mailDispatchService.sendBrandedEmail({
          to: opsRecipient,
          subject: `[GDPR] New privacy request: ${data.request_type}`,
          templateName: 'privacy-request-notification',
          templateContext: {
            requestId: saved.id,
            requestType: data.request_type,
            status: saved.status,
            customerId: customer.id,
            customerEmail: customer.email ?? '-',
            customerName: [customer.name, customer.surname].filter(Boolean).join(' ') || '-',
            reason: data.reason ?? '-',
            createdAt,
          },
          fallbackKey: 'choicetech',
        });
      } catch (error) {
        this.logger.warn(
          `[privacy request notification failed] request_id=${saved.id} ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    } else {
      this.logger.warn(
        `[privacy request notification skipped] PRIVACY_REQUEST_NOTIFICATION_EMAIL is not configured`,
      );
    }

    return {
      message: 'Privacy request submitted successfully',
      data: saved,
    };
  }

  @Cron('0 2 * * *')
  async cleanupExpiredPrivacyRequests() {
    const cutoffDate = this.getPrivacyRequestRetentionCutoff();
    const requestRows = await this.customerPrivacyRequestsRepository.find({
      where: {
        status: In(['completed', 'rejected']),
      } as any,
      select: ['id', 'created_at'],
    });

    const requestIdsToDelete = requestRows
      .filter((request) => request.created_at && request.created_at < cutoffDate)
      .map((request) => request.id)
      .filter(Boolean);

    if (!requestIdsToDelete.length) {
      return { message: 'No expired privacy requests found', count: 0 };
    }

    await this.notificationRepository.delete({
      message_id: In(requestIdsToDelete),
    });

    await this.customerPrivacyRequestsRepository.delete({
      id: In(requestIdsToDelete),
    });

    this.logger.log(
      `Expired privacy requests cleaned up: count=${requestIdsToDelete.length} cutoff=${cutoffDate.toISOString()}`,
    );

    return {
      message: 'Expired privacy requests cleaned up',
      count: requestIdsToDelete.length,
    };
  }

  async getPrivacyRequests(customerId: string) {
    return this.customerPrivacyRequestsRepository.find({
      where: { customer_id: Number(customerId) },
      order: { created_at: 'DESC' },
    });
  }

  async updateCustomer(id: string, customerInput: any) {
    const result = await this.CustomersRepository.update(id, customerInput);
    return result;
  }

  async createCustomer(newCustomer: any, locale = 'en') {
    try {
      const customer: any = {
        password_digest: await argon2.hash(newCustomer.password),
        email: newCustomer.email,
        app_id: newCustomer.app_id,
        email_confirmed: newCustomer.email_confirmed ? newCustomer.email_confirmed : false,
        confirm_token: newCustomer.confirm_token,
        phone: newCustomer.phone ? newCustomer.phone : null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result: any = await this.insertCustomer(customer);
      await this.recordCustomerLog(
        {
          customer_id: result?.id,
          consultant_id: result?.consultant_id ?? newCustomer?.consultant_id ?? null,
          app_id: result?.app_id ?? newCustomer?.app_id ?? null,
          email: result?.email ?? newCustomer?.email ?? null,
          phone: result?.phone ?? newCustomer?.phone ?? null,
        },
        'customer_create',
        'create',
      );
      return result;
    } catch (e) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.CUSTOM_ERROR,
        undefined,
        locale,
      );
    }
  }

  async validateCustomer(email: string, app_id: number, password: string, locale = 'en') {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'notes',
      'push_token',
      'app_id',
      'company_id',
      'consultant_id',
      'skin_color_group_id',
      'ethnicity_id',
      'sign_in_count',
      'image_url',
      'country_id',
      'gender_id',
      'birth',
      'token',
      'social',
      'password_digest',
      'email_confirmed',
    ];

    const includes = [
      'country',
      'products',
      'products.device',
      'products.license',
      'products.device.consultant_company',
      'products.device.consultant_company.applications',
      'products.application',
    ];

    const customer: any = await this.getCustomer({ email, app_id }, selections, includes);

    if (!customer || customer === null) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.LOGIN_FAILED,
        undefined,
        locale,
      );
    }

    const product = await this.productService.getProducts(customer?.id);

    if (customer?.products && customer?.products.length === 0) {
      customer.products = product;
    }

    if (customer?.products && product.length > 0 && customer?.products.length > 0) {
      customer.products.push(...product);
    }

    customer?.products.forEach((product: any) => {
      const expiryMeta = this.licenseDomainService.resolveExpiryMeta({
        firstUseDate: product.first_use_date,
        licensePeriod: product.license_period,
        licenseName: product.license?.name,
      });
      product.expired_date = expiryMeta.expiredDate;
      product.is_expired = expiryMeta.isExpired;
    });

    // if (customer === null) {
    //   customer = await this.replicateCustomer.replicateUserToMasterOperation(
    //     email,
    //     app_id,
    //     selections,
    //     includes,
    //   );
    // }

    if (customer?.optic_number) customer.optic_number = customer?.getOpticNumbers;
    if (customer?.consultant_name) customer.consultant_name = customer?.getConsultantName;

    customer.consultant_name = customer?.getConsultantName;
    customer.optic_number = customer?.getOpticNumbers;
    customer.gender = customer.gender_id;

    const confirmPwd = await this.verifyPassword(
      password,
      customer?.password_digest ?? null,
      locale,
    );

    if (confirmPwd) {
      return { ...customer };
    }

    throw ErrorExceptionFactory.createFromStatus(
      'badRequest',
      ErrorStatus.LOGIN_FAILED,
      undefined,
      locale,
    );
  }

  async sendAccountConfimationEmail(
    token: string,
    data: any,
    locale: string,
    company: string | null,
  ) {
    try {
      const mailerInfo = resolveEmailBrandConfig({
        consultantCompanyId: data.consultant_company_id,
        appId: data.app_id,
        appName: data.service,
        company,
        fallbackKey: 'choicetech',
      });
      const { subject, templateContext } = this.mailTemplateService.buildEmailConfirmationTemplate({
        locale,
        brandConfig: mailerInfo,
        name: data.name,
        email: data.email,
        appName: data.service,
        confirmationLink: `${process.env.EMAIL_URL}/customers/confirmation?token=${token}`,
        defaultName: 'Customer',
      });

      const result = this.mailDispatchService.sendBrandedEmail({
        to: data.email,
        subject,
        templateName: 'email-confirmation',
        templateContext,
        emailProvider: mailerInfo.emailProvider,
        appId: data.app_id,
        appName: data.service,
      });
      return result;
    } catch (e) {
      return null;
    }
  }

  async resendConfirmation(body: ResendConfirmationDto, locale = 'en', company: string | null) {
    const { email, app_id } = body;

    try {
      const customer = await this.getCustomer({ email, app_id }, [
        'id',
        'email',
        'confirm_token',
        'email_confirmed',
        'name',
      ]);

      const application = await this.applications.findOneApplication(Number(app_id));

      if (!customer) {
        throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
      }

      if (customer.email_confirmed) {
        throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
      }

      await this.sendAccountConfimationEmail(
        customer.confirm_token,
        {
          email: customer.email,
          name: customer.name,
          service: application.name,
          consultant_company_id: application?.consultant_company_id,
          app_id,
        },
        locale,
        company,
      );

      return this.commonService.generateMessage('Confirmation email sent');
    } catch (e) {
      throw e;
    }
  }

  async confirmation(token: string) {
    const customer = await this.getCustomer({ confirm_token: token });
    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }

    await this.updateCustomer(customer.id, { email_confirmed: true });

    return this.commonService.generateMessage('Confirmation successful');
  }

  public async confirmEmail(data: ConfirmHtmlDto, locale = 'en') {
    const { token } = data;
    const customer = await this.getCustomer({ confirm_token: token });

    if (!customer) {
      return this.templateRenderService.renderTemplate(
        'templates',
        'confirm',
        this.templateRenderService.buildConfirmPageContext(locale, false),
      );
    }

    if (customer.email_confirmed) {
      return this.templateRenderService.renderTemplate(
        'templates',
        'confirm',
        this.templateRenderService.buildConfirmPageContext(locale, true),
      );
    }

    await this.updateCustomer(customer.id, { email_confirmed: true });

    return this.templateRenderService.renderTemplate(
      'templates',
      'confirm',
      this.templateRenderService.buildConfirmPageContext(locale, true),
    );
  }

  async customreSignUp(newCustomer: any, locale = 'en', company: string | null) {
    let user = await this.getCustomer({ app_id: newCustomer.app_id });

    if (newCustomer.email) {
      user = await this.getCustomer({
        phone: newCustomer.phone,
        email: newCustomer.email,
        app_id: newCustomer.app_id,
      });
    }

    if (user) {
      throw ErrorExceptionFactory.createFromStatus(
        'conflict',
        ErrorStatus.ACCOUNT_ALREADY_EXISTS,
        undefined,
        locale,
      );
    }

    if (
      newCustomer.email?.includes('@example.test') ||
      newCustomer.email === 'qa@example.com' ||
      newCustomer.email?.includes('@ctk.kr') ||
      newCustomer.email?.includes('@ctktest.kr')
    ) {
      newCustomer.email_confirmed = true;
    }

    const customer = await this.createCustomer(newCustomer, locale);

    const [confirmationToken, tokens, customerData, application] = await Promise.all([
      this.jwtService.generateToken(
        { id: customer.id, email: customer.email, role: Role.Customer },
        TokenTypeEnum.CONFIRMATION,
        customer.domain,
      ),
      this.authService.generateAuthTokens(customer, ''),
      this.getCustomer(
        { id: customer.id, email: customer.email },
        [
          'id',
          'email',
          'name',
          'surname',
          'os',
          'language',
          'phone',
          'address',
          'city',
          'state',
          'zip_code',
          'notes',
          'push_token',
          'app_id',
          'company_id',
          'consultant_id',
          'skin_color_group_id',
          'ethnicity_id',
          'sign_in_count',
          'image_url',
          'country_id',
          'birth',
          'token',
          'social',
        ],
        [
          'country',
          'products',
          'products.device',
          'products.license',
          'products.application',
          'gender',
          'consultant',
        ],
      ),
      this.applications.findOneApplication(newCustomer.app_id),
    ]);

    const [accessToken, refreshToken] = tokens;

    customerData.token = accessToken;
    customerData.refresh_token = refreshToken;

    try {
      await this.updateCustomer(customerData.id, {
        token: refreshToken,
        confirm_token: confirmationToken,
      });

      if (newCustomer.email) {
        await this.sendAccountConfimationEmail(
          confirmationToken,
          {
            email: newCustomer.email,
            name: customerData.name,
            service: application.name,
            consultant_company_id: application?.consultant_company_id,
            app_id: newCustomer.app_id,
          },
          locale,
          company,
        );
      }
    } catch (err) {
      this.logger.warn(`[sendAccountConfimationEmail] ${err instanceof Error ? err.message : err}`);
    }

    return this.normalizeCustomerResponse(customerData, {
      accessToken,
      refreshToken,
    });
  }

  async signUp(newCustomer: any, locale = 'en', company: string | null) {
    const user = await this.getCustomer({ email: newCustomer.email, app_id: newCustomer.app_id });

    if (user) {
      throw ErrorExceptionFactory.createFromStatus(
        'conflict',
        ErrorStatus.ACCOUNT_ALREADY_EXISTS,
        undefined,
        locale,
      );
    }

    if (newCustomer.email.includes('@example.test') || newCustomer.email === 'qa@example.com') {
      newCustomer.email_confirmed = true;
    }

    const customer = await this.createCustomer(newCustomer, locale);

    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'notes',
      'push_token',
      'app_id',
      'company_id',
      'consultant_id',
      'skin_color_group_id',
      'ethnicity_id',
      'sign_in_count',
      'image_url',
      'country_id',
      'birth',
      'token',
      'social',
    ];

    const includes = [
      'country',
      'products.device',
      'products.license',
      'products.application',
      'gender',
    ];

    const [confirmationToken, tokens, customerData, application] = await Promise.all([
      this.jwtService.generateToken(
        { id: customer.id, email: customer.email, role: Role.Customer },
        TokenTypeEnum.CONFIRMATION,
        customer.domain,
      ),
      this.authService.generateAuthTokens(customer, ''),
      this.getCustomer({ id: customer.id, email: customer.email }, selections, includes),
      this.applications.findOneApplication(newCustomer.app_id),
    ]);

    const [accessToken, refreshToken] = tokens;

    await Promise.all([
      this.sendAccountConfimationEmail(
        confirmationToken,
        {
          email: newCustomer.email,
          name: newCustomer.name,
          service: application.name,
          consultant_company_id: application?.consultant_company_id,
          app_id: newCustomer.app_id,
        },
        locale,
        company,
      ),
      this.updateCustomer(customerData.id, {
        token: refreshToken,
        confirm_token: confirmationToken,
      }),
    ]);

    return this.normalizeCustomerResponse(customerData, {
      accessToken,
      refreshToken,
    });
  }

  async login(
    email: string,
    password: string,
    app_id: number,
    locale = 'en',
    company: string | null,
  ) {
    const [getCustomer, application] = await Promise.all([
      this.validateCustomer(email, app_id, password, locale),
      this.applications.findOneApplication(app_id),
    ]);

    const checkToken = this.authService.isTokenExpired(getCustomer.token);

    if (!getCustomer.email_confirmed) {
      if (!checkToken) {
        const confirmationToken = await this.jwtService.generateToken(
          { id: getCustomer.id, email: getCustomer.email, role: Role.Customer },
          TokenTypeEnum.CONFIRMATION,
          '',
        );
        await this.updateCustomer(getCustomer.id, {
          confirm_token: confirmationToken,
        });

        const local_ = locale ?? 'en';
        await this.sendAccountConfimationEmail(
          confirmationToken,
          {
            email: getCustomer.email,
            name: getCustomer.name,
            service: application.name,
            consultant_company_id: application?.consultant_company_id,
            app_id,
          },
          local_,
          company,
        );
      }
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.EMAIL_NOT_CONFIRMED,
        undefined,
        locale,
      );
    }

    const [accessToken, refreshToken] = await this.authService.generateAuthTokens(
      { id: getCustomer.id, email: getCustomer.email, role: Role.Customer },
      '',
    );

    if (getCustomer?.consultant_company?.applications) {
      getCustomer.consultant_company.applications = [];
    }

    if (getCustomer?.products?.length > 0) {
      getCustomer.products.forEach((product: any) => {
        if (product.device && product.device.consultant_company) {
          product.device.consultant_company.applications = [];
        }
      });
    }

    delete getCustomer.password_digest;
    delete getCustomer.recovery_password_digest;
    delete getCustomer.email_confirmed;

    getCustomer.sign_in_count = Number(getCustomer.sign_in_count) + 1;
    getCustomer.token = accessToken;
    getCustomer.refresh_token = refreshToken;

    await this.updateCustomer(getCustomer.id, {
      token: refreshToken,
      sign_in_count: getCustomer.sign_in_count,
    });

    return this.normalizeCustomerResponse(getCustomer, {
      accessToken,
      refreshToken,
    });
  }

  async logout(id: string): Promise<IMessage> {
    await this.updateCustomer(id, { token: null });
    return this.commonService.generateMessage('Logout successful');
  }

  async update(userId: number, customer: UpdateCustomersDto | UpdateCrmCustomersDto) {
    const customerData = await this.CustomersRepository.findOne({
      where: { id: userId },
    });

    if (!customerData) {
      this.logger.warn('Customer data not found');
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    const promises: Promise<any>[] = [];

    if (customer.consultant_shop_id) {
      promises.push(
        this.consultantShops.findOneConsultantShops(Number(customer.consultant_shop_id)),
      );
    }

    if (customer.gender_id) {
      promises.push(this.genders.findOneGender(String(customer.gender_id)));
    }

    if (customer.app_id) {
      promises.push(this.applications.findOneApplication(customer.app_id));
    }

    const countryCodeInput =
      typeof (customer as any).country_code === 'string'
        ? customer.country_code.trim().toUpperCase()
        : typeof (customer as any).country === 'string'
        ? (customer as any).country.trim().toUpperCase()
        : '';

    if (countryCodeInput) {
      const countries = await this.countries.findCountry({ country_code: countryCodeInput }, [
        'id',
        'country_code',
        'name',
      ]);
      const country = countries[0];

      if (!country) {
        this.logger.warn(`Country info missing for country_code=${customer.country_code}`);
        throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
      }

      customer.country_id = country?.id ? Number(country.id) : null;
      customer.country_code = country.country_code;
      customer.country_name = country.name;
    }

    if (customer.skin_color_group_id) {
      promises.push(
        this.skinColorGroups.findOneskinColorGroups(String(customer.skin_color_group_id)),
      );
    }

    if (customer.ethnicity_id) {
      promises.push(this.ethnicities.findOneEthinicities(String(customer.ethnicity_id)));
    }

    const results = await Promise.all(promises);

    for (const [index, result] of results.entries()) {
      if (!result) {
        this.logger.warn(`Result ${index + 1} does not exist`);
        this.commonService.throwNotFoundError();
      }
    }

    customerData.updated_at = new Date();
    Object.assign(customerData, customer);

    customerData.ethnicity_id = customer?.ethnicity_id
      ? Number(customer.ethnicity_id)
      : customerData.ethnicity_id;

    customerData.skin_color_group_id = customer?.skin_color_group_id
      ? Number(customer.skin_color_group_id)
      : customerData.skin_color_group_id;

    if (customer?.consultant_shop_id !== undefined) {
      customerData.consultant_shop_id = customer.consultant_shop_id
        ? Number(customer.consultant_shop_id)
        : null;
    }

    if (customer?.age !== undefined) {
      customerData.age = customer.age ? Number(customer.age) : customer.age;
    }

    if (customer?.phone_country_code !== undefined) {
      customerData.phone_country_code = customer.phone_country_code;
    }

    if (customer?.app_id !== undefined) {
      customerData.app_id = Number(customer.app_id);
    }

    if (customer?.country_id !== undefined) {
      customerData.country_id = customer.country_id ? Number(customer.country_id) : null;
    }

    const updatedCustomer: any = await this.CustomersRepository.save(customerData);

    await this.recordCustomerLog(
      {
        customer_id: updatedCustomer.id,
        consultant_id: updatedCustomer.consultant_id ?? null,
        app_id: updatedCustomer.app_id ?? null,
        email: updatedCustomer.email ?? null,
        phone: updatedCustomer.phone ?? null,
      },
      'customer_update',
      'update',
    );

    const updatedCustomerData = await this.getUpdatedCustomer(updatedCustomer.id);

    const refreshToken = updatedCustomerData.token;
    updatedCustomerData.token = await this.jwtService.generateToken(
      {
        id: updatedCustomerData.id,
        email: updatedCustomerData.email,
        app_id: updatedCustomerData.app_id,
        role: Role.Customer,
      },
      TokenTypeEnum.ACCESS,
      '',
    );
    return this.normalizeCustomerResponse(updatedCustomerData, {
      accessToken: updatedCustomerData.token,
      refreshToken,
    });
  }

  async getUpdatedCustomer(id: string) {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'notes',
      'push_token',
      'app_id',
      'company_id',
      'consultant_id',
      'skin_color_group_id',
      'ethnicity_id',
      'sign_in_count',
      'image_url',
      'country_id',
      'birth',
      'token',
      'social',
      'password_digest',
      'email_confirmed',
    ];

    const includes = [
      'country',
      'products',
      'products.device',
      'products.license',
      'products.device.consultant_company',
      'products.device.consultant_company.applications',
      'products.application',
      'gender',
    ];

    const customer: any = await this.getCustomer({ id }, selections, includes);

    if (customer.products.length === 0) {
      const product = await this.productService.getProducts(customer?.id);
      customer.products = product;
    }

    delete customer.password_digest;
    delete customer.email_confirmed;

    return this.normalizeCustomerResponse(customer);
  }

  async customerDetails(id: string) {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'notes',
      'push_token',
      'app_id',
      'company_id',
      'consultant_id',
      'skin_color_group_id',
      'ethnicity_id',
      'sign_in_count',
      'image_url',
      'gender_id',
      'country_id',
      'birth',
      'token',
      'social',
    ];

    const includes = [
      'country',
      'products',
      'products.device',
      'products.license',
      'products.application',
      'consultant',
    ];

    const customer = await this.getCustomer({ id }, selections, includes);

    if (!customer) {
      this.commonService.throwNotFoundError();
    }

    const linkedProducts = customer.products ?? [];
    const extraProducts = await this.productService.getProducts(customer.id);
    const mergedProducts = [...linkedProducts, ...(extraProducts ?? [])];
    const uniqueProducts = new Map<number, any>();

    mergedProducts.forEach((product: any) => {
      if (product?.id) {
        uniqueProducts.set(Number(product.id), product);
      }
    });

    customer.products = Array.from(uniqueProducts.values());

    const refreshToken = customer.token;
    customer.token = await this.jwtService.generateToken(
      {
        id: customer.id,
        email: customer.email,
        app_id: customer.app_id,
        role: Role.Customer,
      },
      TokenTypeEnum.ACCESS,
      '',
    );
    return this.normalizeCustomerResponse(customer, {
      accessToken: customer.token,
      refreshToken,
    });
  }

  async generateToken() {
    const payload = {
      id: 1,
      name: '',
      email: '',
      app_id: '',
    };
    const token = await this.jwtService.generateToken(payload, TokenTypeEnum.ACCESS, '');
    return { token };
  }

  public async passwordChange(
    customerId: string,
    customer: ChangePasswordCustomerDto,
    locale = 'en',
  ) {
    const { password, new_password } = customer;

    const customerData = await this.getCustomer(
      { id: customerId },
      ['id', 'email', 'name', 'password_digest', 'app_id', 'consultant_id'],
      ['consultant'],
    );

    if (!customerData) {
      this.commonService.throwNotFoundError(locale);
    }

    const confirmPwd = await this.verifyPassword(
      password,
      customerData.password_digest ?? null,
      locale,
    );

    if (!confirmPwd) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.LOGIN_FAILED,
        undefined,
        locale,
      );
    }

    const new_password_digest = await argon2.hash(new_password);
    const updatedCustomer = await this.updateCustomer(customerId, {
      password_digest: new_password_digest,
    });

    if (!updatedCustomer.affected) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.PASSWORD_CHANGE_FAILED,
        undefined,
        locale,
      );
    }

    if (customerData.email) {
      try {
        await this.sendPasswordResetSuccessEmail(customerData, locale);
      } catch (error) {
        this.logger.warn(
          `[customers/password_change] password reset success mail failed: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    return this.commonService.generateMessage('Password changed successfully');
  }

  async presignUpload(_file: PresignedUploadDto) {}

  async password(data: PasswordDto, locale = 'en') {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'notes',
      'push_token',
      'app_id',
      'company_id',
      'consultant_id',
      'skin_color_group_id',
      'ethnicity_id',
      'sign_in_count',
      'image_url',
      'country_id',
      'country',
      'birth',
      'gender',
      'social',
      'products',
    ];

    const [application, customer] = await Promise.all([
      this.applications.findOneApplication(Number(data.app_id)),
      this.getCustomer({ email: data.email, app_id: data.app_id }, selections, ['consultant']),
    ]);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus(
        'notFound',
        ErrorStatus.CUSTOMER_NOT_FOUND,
        undefined,
        locale,
      );
    }

    const password = this.commonService.generateRandomPassword(12);
    const hashedPassword = await argon2.hash(password);

    await this.updateCustomer(customer.id, { password_digest: hashedPassword });

    const consultantCompanyId =
      customer.consultant?.consultant_company_id ?? application?.consultant_company_id;
    await this.sendPasswordResetEmail(
      {
        email: customer.email,
        password,
        name: customer.name,
        service: application.name,
        consultant_company_id: consultantCompanyId,
        app_id: data.app_id,
      },
      locale,
    );

    customer.optic_number = customer.getOpticNumbers;
    customer.consultant_name = customer.getConsultantName;

    return customer;
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

    const nameValue = name ? name : 'Customer';
    const serviceValue = service ? service : 'Chowis';
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

  public async sendPasswordRecoveryNewEmail(data: any, locale = 'en') {
    const { email, link, service, name, consultant_company_id, app_consultant_company_id, app_id } =
      data;

    const nameValue = name ? name : 'Customer';
    const serviceValue = service ? service : 'Chowis';
    const brandId = consultant_company_id ?? app_consultant_company_id;

    const mailerInfo = resolveEmailBrandConfig({
      consultantCompanyId: brandId,
      appId: app_id,
      appName: serviceValue,
      fallbackKey: 'choicetech',
    });
    const { subject, templateContext } = this.mailTemplateService.buildPasswordRecoveryNewTemplate({
      locale,
      brandConfig: mailerInfo,
      name: nameValue,
      appName: serviceValue,
      link,
      defaultName: 'Customer',
    });

    await this.mailDispatchService.sendBrandedEmail({
      to: email,
      subject,
      templateName: 'password-recovery-new',
      templateContext,
      emailProvider: mailerInfo.emailProvider,
      appId: app_id,
      appName: serviceValue,
    });
  }

  async deleteAccount(id: string, data: DeleteCustomerDto) {
    if (!id) {
      return this.commonService.generateMessage('Customer id is required');
    }
    const customer = await this.getCustomer(
      { id: id },
      [],
      ['products', 'chowisCustomerConsents', 'customerApplications'],
    );

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    await this.purgeCustomerRelatedData(customer.id);

    await this.recordCustomerLog(
      {
        customer_id: customer.id,
        consultant_id: customer.consultant_id ?? null,
        app_id: customer.app_id ?? null,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
      },
      data.reason,
      'delete',
    );

    const deletedCustomer = await this.deleteCustomer(id);

    if (!deletedCustomer) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    return this.commonService.generateMessage('Successfully remove account');
  }

  async deleteCustomer(id: string) {
    const deletedCustomer = await this.CustomersRepository.delete(id);

    if (deletedCustomer.affected === 0) {
      return false;
    }
    return true;
  }

  async purgeCustomerRelatedData(customerId: number | string) {
    const id = Number(customerId);

    const customer = await this.getCustomer(
      { id },
      ['id', 'email'],
      ['products', 'chowisCustomerConsents', 'customerApplications'],
    );

    if (!customer) {
      return false;
    }

    await this.deleteBrevoCustomerContact(customer.email);
    await this.activeStorageService.deleteActiveStorageItems('Customer', String(id));

    const productIds = customer.products?.map((p: any) => p.id) ?? [];
    if (productIds.length) {
      await this.productService.updateProducts({ id: In(productIds) }, { customer_id: null });
    }

    await this.productsMultiConnectRepository.delete({
      customer_id: id,
    });

    const consentIds = customer.chowisCustomerConsents?.map((c: any) => c.id) ?? [];
    await this.chowisCustomerConsentHistoriesRepository.update(
      { customer_id: id },
      { customer_id: null },
    );

    if (consentIds.length) {
      await this.chowisCustomerConsentHistoriesRepository.update(
        { customer_consent_id: In(consentIds) },
        { customer_id: null },
      );

      await this.chowisCustomerConsentRepository.update(
        { id: In(consentIds) },
        { customer_id: null },
      );
    }

    const customerApplicationIds = customer.customerApplications?.map((item: any) => item.id) ?? [];
    if (customerApplicationIds.length) {
      await this.customerApplicationsRepository.delete({ id: In(customerApplicationIds) });
    }

    const privacyRequests = await this.customerPrivacyRequestsRepository.find({
      where: { customer_id: id },
      select: ['id'],
    });
    const privacyRequestIds = privacyRequests.map((request: any) => request.id).filter(Boolean);
    if (privacyRequestIds.length) {
      await this.notificationRepository.delete({
        target_type: TargetType.Consultant,
        message_id: In(privacyRequestIds),
      });

      await this.customerPrivacyRequestsRepository.delete({
        customer_id: id,
      });
    }

    await this.notificationRepository.delete({
      target_type: TargetType.Consultant,
      kind: 'privacy-request-created',
      content: Like(`%Customer ${id} submitted a GDPR privacy request%`),
    });

    await this.notificationRepository.delete({
      target_type: TargetType.Customer,
      target_id: String(id),
    });

    await this.webResultManagementRepository.delete({
      customer_id: id,
    });

    await this.customerLogRepository.update(
      { customer_id: id },
      {
        customer_id: null,
      },
    );

    return true;
  }

  async recordCustomerLog(
    customer: {
      customer_id?: number | string | null;
      consultant_id?: number | string | null;
      app_id?: number | string | null;
      email?: string | null;
      phone?: string | null;
    },
    reason: string,
    actionType: 'create' | 'update' | 'delete' = 'delete',
  ) {
    const redactedEmail =
      typeof customer.email === 'string' ? (redactSensitiveValue(customer.email) as string) : null;
    const redactedPhone =
      typeof customer.phone === 'string' ? (redactSensitiveValue(customer.phone) as string) : null;

    return this.customerLogRepository.save({
      action_type: actionType,
      customer_id:
        actionType === 'delete' ? null : this.parseNumberOrNull(customer.customer_id),
      consultant_id: this.parseNumberOrNull(customer.consultant_id),
      app_id: this.parseNumberOrNull(customer.app_id),
      email: redactedEmail,
      phone: redactedPhone,
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

  async validateUserSocial(email: string, app_id: number, social_id: string) {
    const selections = [
      'id',
      'email',
      'name',
      'surname',
      'os',
      'language',
      'phone',
      'address',
      'city',
      'state',
      'zip_code',
      'notes',
      'push_token',
      'app_id',
      'company_id',
      'consultant_id',
      'skin_color_group_id',
      'ethnicity_id',
      'sign_in_count',
      'image_url',
      'country_id',
      'gender_id',
      'birth',
      'token',
      'social',
      'password_digest',
      'email_confirmed',
    ];

    const includes = [
      'country',
      'products',
      'products.device',
      'products.license',
      'products.device.consultant_company',
      'products.device.consultant_company.applications',
      'products.application',
    ];

    const confirmUser: any = await this.getCustomer({ email, app_id }, selections, includes);

    if (confirmUser) {
      this.updateCustomer(String(confirmUser.id), {
        social_id,
        email_confirmed: true,
      });
      return confirmUser;
    } else {
      const userConfirm: any = {
        email: email,
        app_id: app_id,
        email_confirmed: true,
        rememberCreatedAt: new Date(),
        updated_at: new Date(),
        created_at: new Date(),
      };
      const result: any = await this.insertCustomer(userConfirm);
      return result;
    }
  }

  async socialLogin(data: LoginSocialDto, email: string, locale = 'en', company: string | null) {
    const [getCustomer, application] = await Promise.all([
      this.validateUserSocial(email, Number(data.app_id), data.tokenId),
      this.applications.findOneApplication(Number(data.app_id)),
    ]);

    const checkToken = this.authService.isTokenExpired(getCustomer.token);

    if (!getCustomer.email_confirmed) {
      if (!checkToken) {
        const confirmationToken = await this.jwtService.generateToken(
          { id: getCustomer.id, email: getCustomer.email, role: Role.Customer },
          TokenTypeEnum.CONFIRMATION,
          '',
        );
        await this.updateCustomer(getCustomer.id, {
          confirm_token: confirmationToken,
        });

        await this.sendAccountConfimationEmail(
          confirmationToken,
          {
            email: getCustomer.email,
            name: getCustomer.name,
            service: application.name,
            consultant_company_id: application?.consultant_company_id,
          },
          locale,
          company,
        );
      }
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.EMAIL_NOT_CONFIRMED,
        undefined,
        locale,
      );
    }

    const [accessToken, refreshToken] = await this.authService.generateAuthTokens(
      { id: getCustomer.id, email: getCustomer.email, role: Role.Customer },
      '',
    );

    if (getCustomer?.consultant_company?.applications) {
      getCustomer.consultant_company.applications = [];
    }

    if (getCustomer?.products?.length > 0) {
      getCustomer.products.forEach((product: any) => {
        if (product.device && product.device.consultant_company) {
          product.device.consultant_company.applications = [];
        }
      });
    }

    delete getCustomer.password_digest;
    delete getCustomer.recovery_password_digest;
    delete getCustomer.email_confirmed;

    getCustomer.sign_in_count = Number(getCustomer.sign_in_count) + 1;
    getCustomer.token = accessToken;
    getCustomer.refresh_token = refreshToken;

    await this.updateCustomer(getCustomer.id, {
      token: refreshToken,
      sign_in_count: getCustomer.sign_in_count,
    });

    getCustomer.country_details = getCustomer?.country ?? {};

    getCustomer.country = getCustomer?.country ? getCustomer?.country['name'] : '';

    getCustomer.gender = getCustomer?.gender_id ? getCustomer?.gender_id : null;

    return orderResponseFields(getCustomer, CUSTOMER_RESPONSE_FIELD_ORDER);
  }

  public async refreshToken(data: any) {
    try {
      const { refresh_token } = data;

      if (!refresh_token) {
        throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.INVALID_ACCESS_TOKEN);
      }

      const jwtConfig = this.jwtService['jwtConfig'];
      const tokenAccess = jwtConfig.refresh.secret;

      let decoded;
      try {
        decoded = jwt.verify(refresh_token, tokenAccess);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
              throw ErrorExceptionFactory.createFromStatus('forbidden', ErrorStatus.ACCESS_TOKEN_TIME_OUT);
        } else if (err.name === 'JsonWebTokenError') {
          throw ErrorExceptionFactory.createFromStatus('forbidden', ErrorStatus.INVALID_ACCESS_TOKEN);
        } else {
          throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
        }
      }

      const { id } = decoded as any;

      const customers = await this.getCustomer({ id }, ['id', 'token', 'email']);

      if (!customers) {
        throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.INVALID_ACCESS_TOKEN);
      }

      const [accessToken, new_refresh_token] = await this.authService.generateAuthTokens(
        { id: customers.id, email: customers.email, role: Role.Customer },
        '',
      );

      await this.updateCustomer(customers.id, {
        token: new_refresh_token,
      });

      return {
        token: accessToken,
        refresh_token: new_refresh_token,
      };
    } catch (err) {
      this.logger.error(`refreshToken failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async renderConfirmPageTest(locale: string = 'en', success: boolean = true) {
    return this.templateRenderService.renderTemplate(
      'templates',
      'confirm',
      this.templateRenderService.buildConfirmPageContext(locale, success),
    );
  }

  async renderPasswordRecoveryFormTest(locale: string = 'en') {
    return this.templateRenderService.renderTemplate(
      'email-templates',
      'password-recovery-form',
      this.templateRenderService.buildPasswordRecoveryFormContext(locale, {
        email: 'test@example.com',
        recoverPasswordToken: 'test-token',
        link: 'https://example.com/v1/api/consultants/password-changed',
        appId: '1',
      }),
    );
  }

  async sendPasswordResetSuccessEmail(
    customerData: { email: string; name: string; app_id: number; consultant?: any },
    locale: string = 'en',
    appName?: string,
  ) {
    try {
      if (!customerData.email) return;

      let applicationName = appName;
      let applicationConsultantCompanyId: number | null = null;

      if (!applicationName) {
        try {
          const application = await this.applications.findOneApplication(customerData.app_id);
          applicationName = application.name;
          applicationConsultantCompanyId = application?.consultant_company_id ?? null;
        } catch (e) {
          this.logger.warn('Application not found for email test, using default name');
          applicationName = 'Test App';
        }
      }

      const brandId =
        customerData.consultant?.consultant_company_id ?? applicationConsultantCompanyId;
      const mailerInfo = resolveEmailBrandConfig({
        consultantCompanyId: brandId,
        appId: customerData.app_id,
        appName: applicationName,
        fallbackKey: 'choicetech',
      });
      const { subject, templateContext } =
        this.mailTemplateService.buildPasswordResetSuccessTemplate({
          locale,
          brandConfig: mailerInfo,
          name: customerData.name ? customerData.name : 'Customer',
          appName: applicationName,
          defaultName: 'Customer',
          greetingKey: 'pass_reset_success_greeting',
        });

      await this.mailDispatchService.sendBrandedEmail({
        to: customerData.email,
        subject,
        templateName: 'password-reset-success',
        templateContext,
        emailProvider: mailerInfo.emailProvider,
        appId: customerData.app_id,
        appName: applicationName,
      });
    } catch (e) {
      this.logger.warn(`[sendPasswordResetSuccessEmail] ${e instanceof Error ? e.message : e}`);
      throw e;
    }
  }
  async sendWebResultEmail(
    customerData: {
      email: string;
      name: string;
      appName: string;
      description: string;
      webResultUrl?: string;
      sukoshiUrl?: string;
      consultant_company_id?: number;
    },
    locale: string = 'en',
  ) {
    try {
      const brandId = customerData.consultant_company_id;
      const mailerInfo = resolveEmailBrandConfig({
        consultantCompanyId: brandId,
        appName: customerData.appName,
        fallbackKey: 'choicetech',
      });
      const { subject, templateContext } = this.mailTemplateService.buildWebResultTemplate({
        locale,
        brandConfig: mailerInfo,
        customerName: customerData.name,
        appName: customerData.appName,
        resultLink: customerData.webResultUrl || customerData.sukoshiUrl,
        description: customerData.description,
        logoUrl: mailerInfo.logos as any,
        footerLogo: mailerInfo.logos,
        contact: mailerInfo.contact,
        isAlfaparf: (mailerInfo.displayName || '').toLowerCase().includes('alfaparf'),
      });

      await this.mailDispatchService.sendBrandedEmail({
        to: customerData.email,
        subject,
        templateName: 'web-result',
        templateContext,
        emailProvider: mailerInfo.emailProvider,
        appName: customerData.appName,
      });
    } catch (e) {
      this.logger.warn(`[sendWebResultEmail] ${e instanceof Error ? e.message : e}`);
      throw e;
    }
  }
}
