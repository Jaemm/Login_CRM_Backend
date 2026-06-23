import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface BrevoConsultantSyncPayload {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  application?: string | null;
  appId?: number | string | null;
  appIds?: string | null;
  country?: string | null;
  language?: string | null;
  isMarketingConsent?: boolean | null;
  emailBlacklisted?: boolean | null;
}

type BrevoContactBody = {
  email?: string;
  attributes?: Record<string, string>;
  listIds?: number[];
  // unlinkListIds?: number[];
  updateEnabled?: boolean;
  smsBlacklisted?: boolean;
  emailBlacklisted?: boolean;
};

type BrevoContact = {
  email?: string;
  attributes?: Record<string, unknown>;
};

const DEFAULT_MARKETING_LIST_IDS = [4, 7];

@Injectable()
export class BrevoService {
  private readonly logger = new Logger(BrevoService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.client = axios.create({
      baseURL: this.configService.get<string>('BREVO_BASE_URL') || 'https://api.brevo.com/v3',
      headers: apiKey
        ? {
            'api-key': apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
          }
        : undefined,
      timeout: 15000,
    });
  }

  private get marketingListIds(): number[] {
    return [...DEFAULT_MARKETING_LIST_IDS];
  }

  private isProductionEnvironment(): boolean {
    const env = this.configService.get<string>('ENV') || this.configService.get<string>('NODE_ENV');
    return env === 'production';
  }

  isEnabled(): boolean {
    return this.isProductionEnvironment() && !!this.configService.get<string>('BREVO_API_KEY');
  }

  private isChoicetechEmail(email?: string | null): boolean {
    const normalizedEmail = email?.trim().toLowerCase();
    return !!normalizedEmail && normalizedEmail.endsWith('@example.com');
  }

  private shouldSkipBrevoSync(email?: string | null): boolean {
    return this.isChoicetechEmail(email);
  }

  private cleanAttributes(attributes: Record<string, string | undefined | null>) {
    return Object.entries(attributes).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private normalizeAppIdValue(value: unknown): string[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.normalizeAppIdValue(item));
    }

    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private mergeAppIds(existingValue: unknown, nextValue?: number | string | null): string | undefined {
    const existingIds = this.normalizeAppIdValue(existingValue);
    const incomingIds = this.normalizeAppIdValue(nextValue);

    const mergedIds = Array.from(new Set([...existingIds, ...incomingIds]));
    if (!mergedIds.length) {
      return undefined;
    }

    return mergedIds.join(',');
  }

  private buildSmsNumber(phoneCountryCode?: string | null, phone?: string | null) {
    const normalizedPhone = (phone ?? '').replace(/[^\d]/g, '');
    if (!normalizedPhone) {
      return undefined;
    }

    const normalizedCountryCode = (phoneCountryCode ?? '').replace(/[^\d]/g, '');
    if (!normalizedCountryCode) {
      return undefined;
    }

    let localNumber = normalizedPhone;

    if (localNumber.startsWith(normalizedCountryCode)) {
      localNumber = localNumber.slice(normalizedCountryCode.length);
    }

    localNumber = localNumber.replace(/^0+/, '');

    if (!localNumber) {
      return undefined;
    }

    const sms = `+${normalizedCountryCode}${localNumber}`;

    if (!/^\+[1-9]\d{7,14}$/.test(sms)) {
      return undefined;
    }

    const parsedPhoneNumber = parsePhoneNumberFromString(sms);
    if (!parsedPhoneNumber?.isValid()) {
      this.logger.warn(
        `Brevo SMS skipped: invalid phone number phoneCountryCode=${phoneCountryCode ?? ''} phone=${
          phone ?? ''
        } normalized=${sms}`,
      );
      return undefined;
    }

    return parsedPhoneNumber.number;
  }

  private buildContactBody(payload: BrevoConsultantSyncPayload): BrevoContactBody {
    const marketingListIds = this.marketingListIds;
    const hasMarketingConsent =
      payload.isMarketingConsent !== undefined && payload.isMarketingConsent !== null;
    const emailBlacklisted =
      payload.emailBlacklisted === undefined || payload.emailBlacklisted === null
        ? undefined
        : payload.emailBlacklisted;
    const sms = this.buildSmsNumber(payload.phoneCountryCode, payload.phone);
    const smsBlacklisted =
      sms && payload.isMarketingConsent !== undefined && payload.isMarketingConsent !== null
        ? !payload.isMarketingConsent
        : undefined;

    const attributes = this.cleanAttributes({
      EMAIL: payload.email,
      FIRSTNAME: payload.firstName ?? undefined,
      LASTNAME: payload.lastName ?? undefined,
      SMS: sms,
      APPLICATION: payload.application ?? undefined,
      APP_IDS: payload.appIds ?? undefined,
      COUNTRY: payload.country ?? undefined,
      LANGUAGE: payload.language ?? undefined,
    });

    return {
      email: payload.email,
      attributes,
      updateEnabled: true,
      ...(smsBlacklisted !== undefined ? { smsBlacklisted } : {}),
      ...(emailBlacklisted !== undefined ? { emailBlacklisted } : {}),
      ...(marketingListIds.length && hasMarketingConsent
        ? payload.isMarketingConsent
          ? { listIds: marketingListIds }
          : { listIds: marketingListIds }
        : {}),
    };
  }

  private logSuccess(action: string, email: string, status?: number) {
    const statusSuffix = status ? ` status=${status}` : '';
    this.logger.log(`Brevo ${action} success: email=${email}${statusSuffix}`);
  }

  private logRequest(action: string, body: BrevoContactBody) {
    this.logger.log(
      `Brevo ${action} request: ${JSON.stringify({
        email: body.email,
        attributes: body.attributes,
        listIds: body.listIds,
        // unlinkListIds: body.unlinkListIds,
        updateEnabled: body.updateEnabled,
        smsBlacklisted: body.smsBlacklisted,
        emailBlacklisted: body.emailBlacklisted,
      })}`,
    );
  }

  private async getContact(identifier: string): Promise<BrevoContact | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const response = await this.client.get(`/contacts/${encodeURIComponent(identifier)}`);
      return response.data ?? null;
    } catch (error) {
      const axiosError = error as { response?: { status?: number; data?: { code?: string } } };
      if (
        axiosError?.response?.status === 404 &&
        axiosError?.response?.data?.code === 'document_not_found'
      ) {
        return null;
      }

      this.logFailure('getContact', error);
      throw error;
    }
  }

  private logFailure(action: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      stack?: string;
    };
    const status = axiosError?.response?.status;
    const responseData = axiosError?.response?.data;

    this.logger.error(
      `Brevo ${action} failed: ${message}${status ? ` status=${status}` : ''}${
        responseData !== undefined ? ` response=${JSON.stringify(responseData)}` : ''
      }`,
      error instanceof Error ? error.stack : undefined,
    );
  }

  async addContact(payload: BrevoConsultantSyncPayload) {
    if (!this.isEnabled()) {
      this.logger.warn(`Brevo addContact skipped: disabled email=${payload.email}`);
      return;
    }

    if (this.shouldSkipBrevoSync(payload.email)) {
      this.logger.log(`Brevo addContact skipped: excluded domain email=${payload.email}`);
      return;
    }

    try {
      const body = this.buildContactBody(payload);
      this.logRequest('addContact', body);
      const response = await this.client.post('/contacts', body);
      this.logSuccess('addContact', payload.email, response.status);
      return response;
    } catch (error) {
      this.logFailure('addContact', error);
      throw error;
    }
  }

  async updateContact(identifier: string, payload: BrevoConsultantSyncPayload) {
    if (!this.isEnabled()) {
      this.logger.warn(`Brevo updateContact skipped: disabled email=${payload.email}`);
      return;
    }

    if (this.shouldSkipBrevoSync(payload.email)) {
      this.logger.log(`Brevo updateContact skipped: excluded domain email=${payload.email}`);
      return;
    }

    try {
      const body = this.buildContactBody(payload);
      this.logRequest('updateContact', body);
      const response = await this.client.put(`/contacts/${encodeURIComponent(identifier)}`, body);
      this.logSuccess('updateContact', payload.email, response.status);
      return response;
    } catch (error) {
      this.logFailure('updateContact', error);
      throw error;
    }
  }

  async deleteContact(identifier: string) {
    if (!this.isEnabled()) {
      this.logger.warn(`Brevo deleteContact skipped: disabled identifier=${identifier}`);
      return;
    }

    try {
      const response = await this.client.delete(`/contacts/${encodeURIComponent(identifier)}`);
      this.logSuccess('deleteContact', identifier, response.status);
      return response;
    } catch (error) {
      const axiosError = error as { response?: { status?: number; data?: { code?: string } } };
      if (
        axiosError?.response?.status === 404 &&
        axiosError?.response?.data?.code === 'document_not_found'
      ) {
        this.logger.log(`Brevo deleteContact skipped: contact not found identifier=${identifier}`);
        return;
      }

      this.logFailure('deleteContact', error);
      throw error;
    }
  }

  async syncContact(payload: BrevoConsultantSyncPayload, previousEmail?: string | null) {
    if (!this.isEnabled()) {
      this.logger.warn(`Brevo syncContact skipped: disabled email=${payload.email}`);
      return;
    }

    if (this.shouldSkipBrevoSync(payload.email)) {
      this.logger.log(`Brevo syncContact skipped: excluded domain email=${payload.email}`);
      return;
    }

    try {
      const updateTarget =
        previousEmail && previousEmail !== payload.email ? previousEmail : payload.email;

      const existing = await this.getContact(updateTarget);
      const appIds = this.mergeAppIds(existing?.attributes?.APP_IDS, payload.appId);
      const syncPayload = {
        ...payload,
        appIds,
      };

      if (previousEmail && previousEmail !== payload.email) {
        return await this.updateContact(previousEmail, syncPayload);
      }

      if (existing) {
        return await this.updateContact(payload.email, syncPayload);
      }

      return await this.addContact(syncPayload);
    } catch (error) {
      if (previousEmail && previousEmail !== payload.email) {
        try {
          const response = await this.addContact({
            ...payload,
            appIds: this.mergeAppIds(undefined, payload.appId),
          });
          return response;
        } catch (fallbackError) {
          this.logger.error(
            `Brevo sync fallback failed: ${
              fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
            }`,
            fallbackError instanceof Error ? fallbackError.stack : undefined,
          );
        }
      }

      this.logger.error(
        `Brevo syncContact failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async syncNewsletterPreference(
    email: string,
    receiveNewsletter: boolean,
    appId?: number | string | null,
  ) {
    if (!this.isEnabled()) {
      this.logger.warn(`Brevo syncNewsletterPreference skipped: disabled email=${email}`);
      return;
    }

    if (this.shouldSkipBrevoSync(email)) {
      this.logger.log(`Brevo syncNewsletterPreference skipped: excluded domain email=${email}`);
      return;
    }

    try {
      const response = await this.syncContact({
        email,
        emailBlacklisted: !receiveNewsletter,
        appId,
      });
      this.logSuccess('syncNewsletterPreference', email, response?.status);
      return response;
    } catch (error) {
      this.logFailure('syncNewsletterPreference', error);
      throw error;
    }
  }
}
