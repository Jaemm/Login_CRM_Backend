import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelectByString, Repository } from 'typeorm';
import { ChowisCustomerConsents } from '@/src/common/entities/crmEntities/ChowisCustomerConsents.entity';
import { ConsultantsService } from '../consultants/consultants.service';
import { CustomerConsentsDto } from './customerConsents.dto';
import { WithdrawCustomerConsentDto } from './customerConsents.dto';
import { CustomersService } from '../customers/customers.service';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { CommonService } from '@/src/common/common.service';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { BrevoService } from '@/src/common/brevo.service';
import { ChowisCustomerConsentHistories } from '@/src/common/entities/crmEntities/ChowisCustomerConsentHistories.entity';

@Injectable()
export class CustomerConsentsService {
  private readonly logger = new Logger(CustomerConsentsService.name);

  constructor(
    @InjectRepository(ChowisCustomerConsents)
  private readonly customerConsentsRepository: Repository<ChowisCustomerConsents>,
    @InjectRepository(ChowisCustomerConsentHistories)
    private readonly customerConsentHistoriesRepository: Repository<ChowisCustomerConsentHistories>,
    private readonly consultantsService: ConsultantsService,
    private readonly customersService: CustomersService,
    private readonly commonService: CommonService,
    private readonly brevoService: BrevoService,
  ) {}

  private async syncBrevoCustomerConsent(customerId: string | number, receiveNewsletter?: boolean) {
    const customer = await this.customersService.getCustomer(
      { id: customerId },
      ['id', 'email', 'app_id'],
    );

    if (!customer?.email) {
      return;
    }

    await this.brevoService.syncNewsletterPreference(
      customer.email,
      !!receiveNewsletter,
      customer.app_id,
    );
  }

  private async recordConsentHistory(
    consent: ChowisCustomerConsents,
    actionType: 'create' | 'update' | 'withdraw',
    withdrawalReason?: string | null,
  ) {
    await this.customerConsentHistoriesRepository.save({
      customer_id: consent.customer_id ?? null,
      customer_consent_id: Number(consent.id),
      consultant_id: consent.consultant_id ?? null,
      action_type: actionType,
      consent_version: consent.consentVersion ?? null,
      consent_type: consent.consentType ?? null,
      consent_form_answers: consent.consentFormAnswers ?? null,
      consent_text: consent.consentText ?? null,
      data_transfer: consent.dataTransfer ?? null,
      data_privacy: consent.dataPrivacy ?? null,
      receive_license_notification: consent.receiveLicenseNotification ?? null,
      receive_newsletter: consent.receiveNewsletter ?? null,
      additional_information: consent.additionalInformation ?? null,
      withdrawal_reason: withdrawalReason ?? consent.withdrawalReason ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  private async createOrUpdateCustomerConsent(
    customerConsents: CustomerConsentsDto,
    isUpdate = false,
    id?: string,
  ) {
    const { customer_id, consultant_id } = customerConsents;

    const customer = await this.customersService.getCustomer({ id: customer_id });
    if (!customer) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    if (consultant_id) {
      const consultant = await this.consultantsService.findOneConsultant(Number(consultant_id));
      if (!consultant) {
        this.commonService.throwNotFoundError();
      }
    }

    const consentInput: ChowisCustomerConsents = {
      customer_id: Number(customer_id),
      consultant_id: consultant_id ? Number(consultant_id) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      consentFormAnswers: [customerConsents.consent_form_answers],
      consentVersion: customerConsents.consent_version ?? null,
      consentText: customerConsents.consent_text ?? null,
      dataTransfer: customerConsents.data_transfer,
      dataPrivacy: customerConsents.data_privacy,
      receiveLicenseNotification: customerConsents.receive_license_notification,
      receiveNewsletter: customerConsents.receive_newsletter,
      additionalInformation: customerConsents.additional_information,
      consentType: customerConsents.consent_type,
      withdrawnAt: null,
      withdrawalReason: null,
    } as ChowisCustomerConsents;

    if (isUpdate && id) {
      const result = await this.customerConsentsRepository.update(Number(id), consentInput);
      if (result.affected) {
        const savedConsent = await this.customerConsentsRepository.findOne({ where: { id } });
        if (savedConsent) {
          await this.recordConsentHistory(savedConsent, 'update');
        }
        try {
          await this.syncBrevoCustomerConsent(customer_id, customerConsents.receive_newsletter);
        } catch (error) {
          this.logger.warn(
            `[Brevo newsletter sync failed] customer_id=${customer_id} ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }
      return result.affected ? { message: 'Success!' } : { message: 'Something went wrong!' };
    } else {
      const result = await this.customerConsentsRepository.save(consentInput);
      try {
        if (result) {
          await this.recordConsentHistory(result, 'create');
        }
        await this.syncBrevoCustomerConsent(customer_id, customerConsents.receive_newsletter);
      } catch (error) {
        this.logger.warn(
          `[Brevo newsletter sync failed] customer_id=${customer_id} ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
      return result ? { message: 'Success!' } : { message: 'Something went wrong!' };
    }
  }

  async findOneCustomerConsents(id: string) {
    const consent = await this.customerConsentsRepository.findOne({ where: { id } });
    if (!consent) {
      this.commonService.throwNotFoundError();
    }
    return consent;
  }

  async insertCustomerConsents(customerConsents: ChowisCustomerConsents) {
    const newConsent = this.customerConsentsRepository.create(customerConsents);
    return await this.customerConsentsRepository.save(newConsent);
  }

  async updateConsent(id: string, customerConsents: ChowisCustomerConsents) {
    return this.customerConsentsRepository.update(Number(id), customerConsents);
  }

  async findCustomerConsents(conditions?: any, selections?: string[], includes?: string[]) {
    const consents = await this.customerConsentsRepository.find({
      where: conditions,
      select: selections ? (selections as FindOptionsSelectByString<ChowisCustomerConsents>) : [],
      relations: includes,
    });
    if (!consents) {
      this.commonService.throwNotFoundError();
    }
    return consents;
  }

  async createCustomerConsents(customerConsents: CustomerConsentsDto) {
    return this.createOrUpdateCustomerConsent(customerConsents);
  }

  async createCustomerConsentsForConsultant(customerConsents: CustomerConsentsDto) {
    return this.createOrUpdateCustomerConsent(customerConsents);
  }

  async updateCustomerConsents(id: string, customerConsents: CustomerConsentsDto) {
    if (!id) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }
    return this.createOrUpdateCustomerConsent(customerConsents, true, id);
  }

  async updateCustomerConsentsForConsultant(id: string, customerConsents: CustomerConsentsDto) {
    if (!id) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }
    return this.createOrUpdateCustomerConsent(customerConsents, true, id);
  }

  async withdrawCustomerConsent(payload: WithdrawCustomerConsentDto) {
    const consent = await this.customerConsentsRepository.findOne({
      where: { id: String(payload.consent_id), customer_id: Number(payload.customer_id) },
    });

    if (!consent) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.CUSTOMER_NOT_FOUND);
    }

    consent.receiveNewsletter = false;
    consent.receiveLicenseNotification = false;
    consent.withdrawnAt = new Date();
    consent.withdrawalReason = payload.withdrawal_reason ?? null;
    consent.updatedAt = new Date();

    const result = await this.customerConsentsRepository.save(consent);
    await this.recordConsentHistory(result, 'withdraw', payload.withdrawal_reason ?? null);

    try {
      await this.syncBrevoCustomerConsent(payload.customer_id, false);
    } catch (error) {
      this.logger.warn(
        `[Brevo newsletter sync failed] customer_id=${payload.customer_id} ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    return { message: 'Success!' };
  }
}
