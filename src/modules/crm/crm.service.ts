import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Between, Repository } from 'typeorm';
import { ConsultantsService } from '../consultants/consultants.service';
import {
  CustomerSyncDto,
  GetCustomerLogDto,
  GetByEmailDto,
  GetCustomerDto,
  GetPrivacyRequestsDto,
  HandlePrivacyRequestDto,
  PresignedUploadDto,
  UpdateConsentForm,
  UpdateCrmCustomersDto,
} from './crm.dto';
import { CustomersService } from '../customers/customers.service';
import { CountriesService } from '../countries/countries.service';
import { ProductsService } from '../products/products.service';
import { ChowisCustomerConsents } from '@/src/common/entities/crmEntities/ChowisCustomerConsents.entity';
import { CommonService } from '@/src/common/common.service';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { CustomerConsentsService } from '../customerConsents/customerConsents.service';
import axios from 'axios';
import * as fs from 'fs';
import * as FormData from 'form-data';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { JwtService } from '@/src/jwt/jwt.service';
import { ResendConfirmationDto } from '../customers/customers.dto';
import { ApplicationsService } from '../applications/applications.service';
import { Role } from '@/src/common/enums/role.enum';
import { CustomerLog } from '@/src/common/entities/crmEntities/CustomerLog.entity';
import { CustomerPrivacyRequests } from '@/src/common/entities/crmEntities/CustomerPrivacyRequests.entity';
import { Notifications } from '@/src/common/entities/crmEntities/Notifications.entity';
import { TargetType } from '@/src/common/enums/target-type.enum';
import { DeleteCustomerDto } from '../customers/customers.dto';

const RECTIFICATION_ALLOWED_FIELDS = new Set([
  'email',
  'name',
  'surname',
  'os',
  'language',
  'phone',
  'birth',
  'address',
  'app_id',
  'age',
  'skin_color_group_id',
  'ethnicity_id',
  'city',
  'state',
  'zip_code',
  'phone_country_code',
  'country_code',
  'country',
  'country_id',
  'country_name',
  'gender_id',
  'consultant_shop_id',
]);

@Injectable()
export class CRMService {
  private readonly logger = new Logger(CRMService.name);

  constructor(
    @InjectRepository(ChowisCustomerConsents)
    private readonly chowisCustomerConsentRepository: Repository<ChowisCustomerConsents>,

    @InjectRepository(CustomerLog)
    private readonly customerLogRepository: Repository<CustomerLog>,

    @InjectRepository(CustomerPrivacyRequests)
    private readonly customerPrivacyRequestsRepository: Repository<CustomerPrivacyRequests>,

    @InjectRepository(Notifications)
    private readonly notificationRepository: Repository<Notifications>,

    private readonly customerService: CustomersService,
    private consultantsService: ConsultantsService,
    private countriesService: CountriesService,
    private productService: ProductsService,
    private commonService: CommonService,
    private customerConsentsService: CustomerConsentsService,
    private readonly jwtService: JwtService,
    private readonly applications: ApplicationsService,
  ) {}

  private extractRectificationUpdates(payload: Record<string, any> | null | undefined) {
    const candidate =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload.updates && typeof payload.updates === 'object' && !Array.isArray(payload.updates)
          ? payload.updates
          : payload
        : null;

    if (!candidate) {
      return {};
    }

    const updates: Record<string, any> = {};

    for (const [key, value] of Object.entries(candidate)) {
      if (RECTIFICATION_ALLOWED_FIELDS.has(key) && value !== undefined) {
        updates[key] = value;
      }
    }

    return updates;
  }

  private filterExportDataByRole(exportData: Record<string, any>, role: string) {
    if (role === Role.Admin) {
      return exportData;
    }

    const { customer_logs, notifications, ...rest } = exportData ?? {};
    const profile = rest.profile ? { ...rest.profile } : null;

    if (profile) {
      delete profile.notes;
      delete profile.push_token;
      delete profile.social;
      delete profile.email;
      delete profile.phone;
      delete profile.phone_country_code;
      delete profile.address;
      delete profile.birth;
      delete profile.gdpr_processing_restriction_reason;
    }

    return {
      ...rest,
      profile,
      customer_logs: [],
      notifications: [],
    };
  }

  private async getScopedCustomerIds(consultantId: number) {
    return this.customerService.getConsultantScopedCustomerIds(consultantId);
  }

  private async assertPrivacyRequestAccess(
    request: CustomerPrivacyRequests,
    consultantId: number,
    role: string,
  ) {
    if (role === Role.Admin) {
      return;
    }

    if (!consultantId || Number.isNaN(consultantId)) {
      throw ErrorExceptionFactory.createFromStatus(
        'forbidden',
        ErrorStatus.PERMISSION_DENIED,
      );
    }

    if (request.customer_id === null || request.customer_id === undefined) {
      throw ErrorExceptionFactory.createFromStatus(
        'forbidden',
        ErrorStatus.PERMISSION_DENIED,
      );
    }

    const scopedCustomerIds = await this.getScopedCustomerIds(consultantId);
    if (!scopedCustomerIds.includes(Number(request.customer_id))) {
      throw ErrorExceptionFactory.createFromStatus(
        'forbidden',
        ErrorStatus.PERMISSION_DENIED,
      );
    }
  }

  async getCustomer(id: number, data: GetCustomerDto) {
    // DTO에서 검색 조건 관련 파라미터 추출
    const { email, name, surname, search } = data;

    // 페이지네이션 처리
    // page / per 값이 없으면 기본값 사용
    const page = data.page ? Number(data.page) : 1;
    const perPage = data.per ? Number(data.per) : 20;

    // 조회 시 반환할 컬럼만 명시적으로 선택 (불필요한 컬럼 조회 방지)
    const selection = {
      id: true,
      email: true,
      external_id: true,
      name: true,
      surname: true,
      os: true,
      language: true,
      phone_country_code: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip_code: true,
      notes: true,
      push_token: true,
      app_id: true,
      company_id: true,
      consultant_id: true,
      skin_color_group_id: true,
      ethnicity_id: true,
      age: true,
      birth: true,
      country_id: true,
      register_date: true,
      created_at: true,
      country_code: true,
      gender_id: true,
      email_confirmed: true,
      consultant_shop_id: true,
    };

    // 함께 조회할 relation 지정 (JOIN 대상)
    const includes = ['country'];

    // 기본 조회 조건
    // 해당 컨설턴트의 고객이면서 quick_analysis 고객은 제외
    let condition: any = { consultant_id: id, quick_analysis: false };

    // 이메일 검색이 들어온 경우 → 이메일 기준으로 조건 덮어쓰기
    if (email) {
      condition = { consultant_id: id, email: email };
    }

    // 이름 검색이 들어온 경우 → 이름 기준으로 조건 덮어쓰기
    if (name) {
      condition = { consultant_id: id, name: name };
    }

    // 성 검색이 들어온 경우 → 성 기준으로 조건 덮어쓰기
    if (surname) {
      condition = { consultant_id: id, surname: surname };
    }

    // consultant id가 없는 경우 예외 처리
    if (!id) {
      this.commonService.throwNotFoundError();
    }

    // 조건 + 검색어 + 페이지네이션 + relation 을 포함한 고객 조회
    const customers = await this.customerService.getCustomersByConsultant(
      condition,
      selection,
      search,
      page,
      perPage,
      includes,
    );

    // 조회 결과 반환
    return customers;
  }

  async getCustomerById(consultantId: number, customerId: number) {
    const selection = {
      customers: {
        id: true,
        email: true,
        name: true,
        surname: true,
        os: true,
        language: true,
        phone_country_code: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip_code: true,
        notes: true,
        push_token: true,
        app_id: true,
        company_id: true,
        consultant_id: true,
        skin_color_group_id: true,
        ethnicity_id: true,
        age: true,
        birth: true,
        register_date: true,
        country_code: true,
        email_confirmed: true,
      },
    };
    const consultant = await this.consultantsService.getConsultant(
      { id: consultantId },
      selection,
      ['customers', 'customers.gender', 'customers.country'],
    );

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const customer = consultant.customers.find((customer: any) => customer.id == customerId);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    customer.country_code = customer.getContryCode;
    customer.gender = customer.getGenderId;
    customer.country_id = customer.getContryId;
    customer.email_confirmed = customer.email_confirmed === true ? true : false;

    return customer;
  }

  async getCustomerLogs(consultantId: number, query: GetCustomerLogDto) {
    const page = query.page ? Math.max(Number(query.page) || 1, 1) : 1;
    const perPage = query.per ? Math.min(Math.max(Number(query.per) || 20, 1), 100) : 20;
    const skip = (page - 1) * perPage;

    const qb = this.customerLogRepository.createQueryBuilder('log');
    qb.where('log.consultant_id = :consultantId', { consultantId });

    if (query.action_type) {
      qb.andWhere('log.action_type = :actionType', { actionType: query.action_type });
    }

    if (query.customer_id) {
      qb.andWhere('log.customer_id = :customerId', { customerId: Number(query.customer_id) });
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

  async getPrivacyRequests(query: GetPrivacyRequestsDto, consultantId?: number, role: string = Role.Consultant) {
    const where: Record<string, any> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.request_type) {
      where.request_type = query.request_type;
    }

    if (query.customer_id) {
      where.customer_id = Number(query.customer_id);
    }

    if (role !== Role.Admin) {
      const scopedCustomerIds = await this.getScopedCustomerIds(Number(consultantId));
      if (!scopedCustomerIds.length) {
        return [];
      }

      if (where.customer_id !== undefined) {
        if (!scopedCustomerIds.includes(Number(where.customer_id))) {
          return [];
        }
      } else {
        where.customer_id = In(scopedCustomerIds);
      }
    }

    return this.customerPrivacyRequestsRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async handlePrivacyRequest(
    consultantId: number,
    requestId: string,
    body: HandlePrivacyRequestDto,
    role: string = Role.Consultant,
  ) {
    const request = await this.customerPrivacyRequestsRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    await this.assertPrivacyRequestAccess(request, consultantId, role);

    const nextStatus = body.status ?? 'completed';
    let responsePayload: Record<string, any> = {
      ...(request.payload as Record<string, any> | null | undefined),
    };

    if (nextStatus === 'processing') {
      request.status = 'processing';
      request.handled_by = String(consultantId);
      request.updated_at = new Date();
      return this.customerPrivacyRequestsRepository.save(request);
    }

    if (nextStatus !== 'rejected') {
      if (request.request_type === 'rectification') {
        const updates = this.extractRectificationUpdates(body.payload);
        if (request.customer_id !== null && request.customer_id !== undefined && Object.keys(updates).length) {
          await this.customerService.update(request.customer_id, updates as any);
          await this.customerService.recordCustomerLog(
            {
              customer_id: request.customer_id,
              consultant_id: consultantId,
              app_id: null,
              email: null,
              phone: null,
            },
            'privacy_request_rectification',
            'update',
          );
          responsePayload = {
            ...responsePayload,
            applied_updates: updates,
          };
        }
      }

      if (request.request_type === 'objection') {
        if (request.customer_id !== null && request.customer_id !== undefined) {
          await this.customerService.updateCustomer(String(request.customer_id), {
            email_subscription: false,
          });
          await this.customerService.recordCustomerLog(
            {
              customer_id: request.customer_id,
              consultant_id: consultantId,
              app_id: null,
              email: null,
              phone: null,
            },
            'privacy_request_objection',
            'update',
          );
        }
        responsePayload = {
          ...responsePayload,
          email_subscription: false,
        };
      }

      if (request.request_type === 'restriction') {
        if (request.customer_id !== null && request.customer_id !== undefined) {
          await this.customerService.updateCustomer(String(request.customer_id), {
            gdpr_processing_restricted: true,
            gdpr_processing_restricted_at: new Date(),
            gdpr_processing_restriction_reason:
              body.response_message ?? request.reason ?? 'GDPR processing restricted',
          });
          await this.customerService.recordCustomerLog(
            {
              customer_id: request.customer_id,
              consultant_id: consultantId,
              app_id: null,
              email: null,
              phone: null,
            },
            'privacy_request_restriction',
            'update',
          );
        }
        responsePayload = {
          ...responsePayload,
          gdpr_processing_restricted: true,
        };
      }

      if (request.request_type === 'erasure') {
        const deleteReason =
          body.response_message || request.reason || 'GDPR erasure request handled';
        const deleteDto: DeleteCustomerDto = {
          reason: deleteReason,
        };
        await this.customerService.deleteAccount(String(request.customer_id), deleteDto);
        responsePayload = {
          ...responsePayload,
          deleted: true,
        };
      }

      if (request.request_type === 'access' || request.request_type === 'portability') {
        const exportData = await this.customerService.exportCustomerData(String(request.customer_id));
        responsePayload = {
          ...responsePayload,
          export: this.filterExportDataByRole(exportData, role),
        };
      }
    }

    request.status = nextStatus;
    request.handled_by = String(consultantId);
    request.response_message = body.response_message ?? request.response_message ?? null;
    request.payload = responsePayload;
    request.handled_at = new Date();
    request.updated_at = new Date();

    const saved = await this.customerPrivacyRequestsRepository.save(request);

    if (request.customer_id !== null && request.customer_id !== undefined) {
      await this.notificationRepository.save(
        this.notificationRepository.create({
          target_type: TargetType.Customer,
          target_id: String(request.customer_id),
          message_id: String(request.id),
          kind: 'privacy-request-handled',
          title: 'Your privacy request was processed',
          content: `Your ${request.request_type} request has been marked as ${nextStatus}.`,
          created_at: new Date(),
          updated_at: new Date(),
          fcmSent: false,
        }),
      );
    }

    await this.customerService.recordCustomerLog(
      {
        customer_id: request.customer_id,
        consultant_id: consultantId,
        app_id: null,
        email: null,
        phone: null,
      },
      `privacy_request_${request.request_type}_${nextStatus}`,
      'update',
    );

    return saved;
  }

  async delete2ndCustomer(app_id: number, email: string) {
    const app_id_ = app_id === 44 ? 53 : 44;

    const customer = await this.customerService.getCustomer(
      { email: email, app_id: app_id_ },
      ['id', 'consultant_id', 'app_id', 'email', 'phone'],
    );

    if (!customer) {
      return false;
    }

    await this.customerService.purgeCustomerRelatedData(customer.id);

    await this.customerService.recordCustomerLog(
      {
        customer_id: customer.id,
        consultant_id: customer.consultant_id ?? null,
        app_id: customer.app_id ?? null,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
      },
      'crm_delete_customer_secondary',
    );

    await this.customerService.deleteCustomer(customer.id);

    return true;
  }

  private async findExistingCustomerForConsultant(
    consultantId: number,
    appId: number,
    email?: string | null,
    phone?: string | null,
  ) {
    const normalizedEmail = email?.trim() || null;
    const normalizedPhone = phone?.trim() || null;

    if (normalizedEmail) {
      const customer = await this.customerService.getCustomer({
        consultant_id: consultantId,
        app_id: appId,
        email: normalizedEmail,
      });

      if (customer) {
        return customer;
      }
    }

    if (normalizedPhone) {
      const customer = await this.customerService.getCustomer({
        consultant_id: consultantId,
        app_id: appId,
        phone: normalizedPhone,
      });

      if (customer) {
        return customer;
      }
    }

    return null;
  }

  async deleteCustomer(consultantId: number, customerId: number) {
    const selection = {
      customers: {
        id: true,
        email: true,
        name: true,
        surname: true,
        os: true,
        language: true,
        phone_country_code: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip_code: true,
        notes: true,
        push_token: true,
        app_id: true,
        company_id: true,
        consultant_id: true,
        skin_color_group_id: true,
        ethnicity_id: true,
        age: true,
        birth: true,
        register_date: true,
        country_code: true,
      },
    };
    const consultant = await this.consultantsService.getConsultant(
      { id: consultantId },
      selection,
      ['customers', 'customers.products', 'customers.chowisCustomerConsents'],
    );

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const customer = consultant.customers.find((customer: any) => customer.id == customerId);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    await this.customerService.purgeCustomerRelatedData(customer.id);

    await this.customerService.recordCustomerLog(
      {
        customer_id: customer.id,
        consultant_id: consultantId,
        app_id: customer.app_id ?? null,
        email: customer.email ?? null,
        phone: customer.phone ?? null,
      },
      'crm_delete_customer',
    );

    const deletedCustomer = await this.customerService.deleteCustomer(customer.id);

    if (consultant.is_hair_skin === true) {
      await this.delete2ndCustomer(consultant.app_id, customer.email);
    }

    if (!deletedCustomer) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.FAILED);
    }

    return this.commonService.generateMessage('Record deleted successfully');
  }

  async register(id: number, data: UpdateCrmCustomersDto) {
    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || null;
    const { app_id, country_code } = data;
    let country_id = data.country_id;

    if (!email && !phone) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    if (!app_id) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const consultant = await this.consultantsService.getConsultant({ id: id }, [], ['customers']);

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const customer = await this.findExistingCustomerForConsultant(consultant.id, Number(app_id), email, phone);

    if (customer) {
      throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.DATA_ALREADY_EXIST);
    }

    if (country_code) {
      const country = await this.countriesService.findOneCountry({ country_code: country_code }, [
        'id',
      ]);
      if (country) {
        country_id = Number(country.id);
      }
    }

    const customerData = {
      ...data,
      email,
      phone,
      consultant_id: consultant.id,
      country_id: country_id,
      register_date: new Date(),
      register_for_crm: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const createdCustomer = await this.customerService.createCrmCustomer(customerData);
    await this.customerService.recordCustomerLog(
      {
        customer_id: createdCustomer.id,
        consultant_id: consultant.id,
        app_id: createdCustomer.app_id ?? null,
        email: createdCustomer.email ?? email,
        phone: createdCustomer.phone ?? phone,
      },
      'crm_customer_register',
      'create',
    );
    const newCustomer = await this.customerService.getCustomer(
      { id: createdCustomer.id },
      [],
      ['country'],
    );

    return {
      id: newCustomer.id,
      email: newCustomer.email,
      name: newCustomer.name,
      surname: newCustomer.surname,
      os: newCustomer.os,
      language: newCustomer.language,
      phone: newCustomer.phone,
      address: newCustomer.address,
      city: newCustomer.city,
      state: newCustomer.state,
      zip_code: newCustomer.zip_code,
      notes: newCustomer.notes,
      push_token: newCustomer.push_token,
      app_id: newCustomer.app_id,
      company_id: newCustomer.company_id,
      consultant_id: newCustomer.consultant_id,
      skin_color_group_id: newCustomer.skin_color_group_id,
      ethnicity_id: newCustomer.ethnicity_id,
      sign_in_count: newCustomer.sign_in_count,
      image_url: newCustomer.image_url,
      country_id: newCustomer.country_id,
      country: newCustomer.country,
      birth: newCustomer.birth,
      gender: newCustomer.gender_id,
      optic_number: newCustomer.getOpticNumbers,
      consultant_name: consultant.name,
      social: newCustomer.social,
    };
  }

  async update2ndCustomer(
    email: string,
    phone: string,
    data: UpdateCrmCustomersDto,
    getConsultant: any,
  ) {
    const originalAppId = Number(getConsultant.app_id);

    let app_id: number;
    switch (originalAppId) {
      case 44:
        app_id = 53;
        break;
      case 53:
        app_id = 44;
        break;
      case 137:
        app_id = 138;
        break;
      case 138:
        app_id = 137;
        break;
      default:
        app_id = originalAppId;
        break;
    }

    const customer = await this.customerService.getCustomer({
      email,
      phone,
      app_id,
    });

    if (!customer) {
      this.logger.warn(`[2ndCustomer] transformed app_id(${app_id}) customer not found`);
      return false;
    }

    if (data?.consultant_id) delete data.consultant_id;

    // 전환된 app_id를 명시적으로 설정
    data.app_id = app_id;

    await this.customerService.update(customer.id, data);

    return true;
  }

  async updateCustomer(customerId: number, data: UpdateCrmCustomersDto) {
    try {
      const customer = await this.customerService.getCustomer({ id: customerId });

      if (!customer) {
        throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
      }

      const getConsultant = await this.consultantsService.getConsultant(
        { id: customer.consultant_id },
        [],
        [],
      );

      const customerData = await this.customerService.update(customerId, data);

      if (getConsultant.is_hair_skin === true) {
        await this.update2ndCustomer(customer.email, customer.phone, data, getConsultant);
      }

      return customerData;
    } catch (e) {
      this.logger.error(`CRM processing error: ${e instanceof Error ? e.message : e}`);

      if (e instanceof HttpException) {
        throw e;
      }

      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }

  async update(consultantId: number, customerId: number, data: UpdateCrmCustomersDto) {
    let country_id = data.country_id;
    const consultant = await this.consultantsService.getConsultant(
      { id: consultantId },
      [],
      ['customers'],
    );

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const customer = consultant.customers.find((c: any) => c.id == customerId);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    if (data.country_code) {
      const country = await this.countriesService.findOneCountry(
        { country_code: data.country_code },
        ['id'],
      );
      if (country) {
        country_id = Number(country.id);
      }
    }

    await this.customerService.update(customerId, { ...data, country_id });
    const updatedCustomer = await this.customerService.getCustomer(
      { id: customerId },
      [],
      ['country', 'gender', 'products'],
    );

    return {
      ...updatedCustomer,
      consultant_name: consultant.name,
      optic_number: updatedCustomer.getOpticNumbers,
    };
  }

  public async enter2ndCustomer(consultant: any, data: any, country_id: number) {
    const app_id = consultant?.app_id === 44 ? 53 : 44;
    const email = consultant?.email;
    const phone = data?.phone ?? null;

    const secondConsultant = await this.consultantsService.findConsultant(app_id, email);

    if (!secondConsultant) {
      this.logger.warn(`[enter2ndCustomer] consultant lookup failed for app_id=${app_id}`);
      return false;
    }

    data.app_id = app_id;
    const customer = {
      ...data,
      consultant_id: secondConsultant.id,
      country_id: country_id,
      register_date: new Date(),
      register_for_crm: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const createdSecondCustomer = await this.customerService.createCrmCustomer(customer);
    await this.customerService.recordCustomerLog(
      {
        customer_id: createdSecondCustomer.id,
        consultant_id: secondConsultant.id,
        app_id: createdSecondCustomer.app_id ?? app_id,
        email: createdSecondCustomer.email ?? email,
        phone: createdSecondCustomer.phone ?? phone,
      },
      'crm_customer_register_secondary',
      'create',
    );

    return true;
  }

  async createCustomer(id: number, data: UpdateCrmCustomersDto) {
    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || null;
    const { app_id, country_code, phone_country_code } = data;
    let country_id = data.country_id;

    if (!email && !phone) {
      this.logger.warn('Email or phone number is required');
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    if (!app_id) {
      this.logger.warn('app_id is required');
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const consultant = await this.consultantsService.getConsultant({ id: id }, [], ['customers']);

    if (!consultant) {
      this.logger.warn('Consultant not found');
      this.commonService.throwNotFoundError();
    }

    const existingCustomer = await this.findExistingCustomerForConsultant(
      consultant.id,
      Number(app_id),
      email,
      phone,
    );

    if (existingCustomer) {
      return {
        id: Number(existingCustomer.id),
        email: existingCustomer.email,
        name: existingCustomer.name,
        surname: existingCustomer.surname,
        os: existingCustomer.os,
        language: existingCustomer.language,
        phone_country_code: existingCustomer.phone_country_code,
        phone: existingCustomer.phone,
        address: existingCustomer.address,
        city: existingCustomer.city,
        state: existingCustomer.state,
        zip_code: existingCustomer.zip_code,
        notes: existingCustomer.notes,
        push_token: existingCustomer.push_token,
        app_id: existingCustomer.app_id,
        company_id: existingCustomer.company_id,
        consultant_id: existingCustomer.consultant_id,
        skin_color_group_id: existingCustomer.skin_color_group_id,
        ethnicity_id: existingCustomer.ethnicity_id,
        age: existingCustomer.age,
        country_id: existingCustomer.country_id,
        birth: existingCustomer.birth,
        country: existingCustomer.country,
        register_date: existingCustomer.register_date,
        country_code: existingCustomer.country_code,
        gender: existingCustomer.gender_id,
      };
    }

    if (!country_id) {
      let country;

      if (country_code) {
        country = await this.countriesService.findOneCountry({ country_code: country_code }, [
          'id',
        ]);
        if (country) {
          country_id = Number(country.id);
        }
      }

      if (!country_id && phone_country_code) {
        country = await this.countriesService.findOneCountry({ phone_code: phone_country_code }, [
          'id',
        ]);
        if (country) {
          country_id = Number(country.id);
        }
      }
    }

    data.service = 'Chowis Service';
    data.consultant_shop_id = consultant.consultant_shop_id;

    const customer = {
      ...data,
      email,
      phone,
      consultant_id: consultant.id,
      country_id: country_id,
      register_date: new Date(),
      register_for_crm: true,
      created_at: new Date(),
      updated_at: new Date(),
      confirm_token: true,
    };

    const createdCustomer = await this.customerService.createCrmCustomer(customer);
    await this.customerService.recordCustomerLog(
      {
        customer_id: createdCustomer.id,
        consultant_id: consultant.id,
        app_id: createdCustomer.app_id ?? null,
        email: createdCustomer.email ?? email,
        phone: createdCustomer.phone ?? phone,
      },
      'crm_customer_create',
      'create',
    );

    if (consultant?.is_hair_skin === true) {
      await this.enter2ndCustomer(consultant, data, country_id);
    }

    return {
      id: Number(createdCustomer.id),
      email: createdCustomer.email,
      name: createdCustomer.name,
      surname: createdCustomer.surname,
      os: createdCustomer.os,
      language: createdCustomer.language,
      phone_country_code: createdCustomer.phone_country_code,
      phone: createdCustomer.phone,
      address: createdCustomer.address,
      city: createdCustomer.city,
      state: createdCustomer.state,
      zip_code: createdCustomer.zip_code,
      notes: createdCustomer.notes,
      push_token: createdCustomer.push_token,
      app_id: createdCustomer.app_id,
      company_id: createdCustomer.company_id,
      consultant_id: createdCustomer.consultant_id,
      skin_color_group_id: createdCustomer.skin_color_group_id,
      ethnicity_id: createdCustomer.ethnicity_id,
      age: createdCustomer.age,
      country_id: createdCustomer.country_id,
      birth: createdCustomer.birth,
      country: createdCustomer.country,
      register_date: createdCustomer.register_date,
      country_code: createdCustomer.country_code,
      gender: createdCustomer.gender_id,
    };
  }

  async getByEmail(id: number, data: GetByEmailDto) {
    const selection = {
      customers: {
        id: true,
        email: true,
        name: true,
        surname: true,
        os: true,
        language: true,
        phone_country_code: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip_code: true,
        notes: true,
        push_token: true,
        app_id: true,
        company_id: true,
        consultant_id: true,
        skin_color_group_id: true,
        ethnicity_id: true,
        age: true,
        birth: true,
        register_date: true,
        country_code: true,
      },
    };
    const consultant = await this.consultantsService.getConsultant({ id: id }, selection, [
      'customers',
      'customers.gender',
      'customers.country',
    ]);

    if (!consultant) {
      this.commonService.throwNotFoundError();
    }

    const customer = consultant.customers.find((customer: any) => customer.email === data.email);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    }

    customer.country_code = customer.getContryCode;
    customer.gender = customer.getGenderId;
    customer.country_id = customer.getContryId;

    return customer;
  }

  async syncCustomer(consultantId: number, authToken: string, data: CustomerSyncDto) {
    const localCustomerId = data.customer_id;
    const { name, email, phone_number, diagnosis_info } = data;

    const customer = await this.customerService.createCrmCustomer({
      consultant_id: consultantId,
      name: name,
      email: email,
      phone: phone_number,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    const cloudCustomerId = customer.id;
    const batches = [];

    for (const d of diagnosis_info) {
      const batchIdUrl = `${process.env.CRM_URL}/analysis/requestBatchId?customer_id=${cloudCustomerId}`;
      const batchIdResponse = await axios
        .get(batchIdUrl, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        .catch((error) => {
          this.logger.error('[crm/requestBatchId] failed', error);
          throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.SERVER_ERROR);
        });
      const batchData = batchIdResponse.data.body || batchIdResponse.data.data;

      const localBatchId = d.batch_id;
      const cloudBatchId = batchData.batch_id;
      batches.push({ local_batch_id: localBatchId, cloud_batch_id: cloudBatchId });

      for (const m of d.measurements) {
        const analysisUrl = `${process.env.CRM_URL}/analysis/offline`;

        let file: any = this.convertToFileFromBase64(m.original_image, 'originalImage.png');
        let file2: any = this.convertToFileFromBase64(m.result_image, 'analyzedImage.png');
        file = fs.createReadStream(file);
        file2 = fs.createReadStream(file2);

        const formData = new FormData();
        formData.append('batchId', cloudBatchId);
        formData.append('type', m.measurement_value);
        formData.append('originalImage', file);
        formData.append('analyzedImage', file2);
        formData.append('multipart', 'true');

        await axios
          .post(analysisUrl, formData, {
            headers: {
              Authorization: `Bearer ${authToken}`,
              ...formData.getHeaders(),
            },
          })
          .catch((error) => {
            this.logger.error('[crm/offline] failed', error);
            throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.SERVER_ERROR);
          });
      }
    }

    return {
      local_customer_id: localCustomerId,
      cloud_customer_id: cloudCustomerId,
      batches: batches,
    };
  }

  async presignedUpload(_data: PresignedUploadDto) {}

  async updateConsentForm(data: UpdateConsentForm) {
    if (!['ipos_consent', 'without_ipos_consent'].includes(data.consent_type)) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const customer = await this.customerService.getCustomer({ id: data.customer_id });

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    return this.commonService.generateMessage('Success update consent form url');
  }

  convertToFileFromBase64(imageData: any, filename: string) {
    imageData = imageData.replace(/^data:image\/png;base64,/, '');

    const dir = 'public/images/crm';

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(`${dir}/${filename}`, imageData);

    return `${dir}/${filename}`;
  }

  async resendConfirmation(
    body: ResendConfirmationDto,
    consultant_id: number,
    locale = 'en',
    company: string | null,
  ) {
    const { email, app_id } = body;

    const [customer, application] = await Promise.all([
      this.customerService.getCustomer({ email, app_id, consultant_id }, [
        'id',
        'email',
        'name',
        'confirm_token',
        'email_confirmed',
      ]),
      this.applications.findOneApplication(Number(app_id)),
    ]);

    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    if (customer.email_confirmed) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    await this.customerService.sendAccountConfimationEmail(
      customer.confirm_token,
      { email: customer.email, name: customer.name, service: application.name },
      locale,
      company,
    );

    return this.commonService.generateMessage('Confirmation email sent');
  }
}
