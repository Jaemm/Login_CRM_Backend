import { Injectable, Logger, LoggerService, OnModuleInit } from '@nestjs/common';
import { validate } from 'class-validator';
import slugify from 'slugify';
import { v4 } from 'uuid';
import { createTransport } from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import axios from 'axios';
import { IMessage } from './interfaces/message.interface';
import { IEmailParams } from './interfaces/email-params.interface';
import { ErrorStatus } from './constants/error-status';
import { Transporter } from 'nodemailer';
import { MonitoringService } from '../modules/monitoring/monitoring.service';
import { attachAirbrakeContext } from './middleWare/exceptions/exceptionHandling/airbrake-context.util';
import { ErrorExceptionFactory } from './middleWare/exceptions/exceptionHandling/error-exception.factory';
import { createErrorResponse } from './response/api-response';

@Injectable()
export class CommonService implements OnModuleInit {
  private readonly logger: LoggerService = new Logger(CommonService.name);
  private translations: Record<string, any> = {};
  private mailTransporter: Transporter;
  private microsoftAccessToken: string;
  private microsoftRefreshToken: string;

  private readonly apiUrl = 'https://api.poeditor.com/v2/';
  private readonly apiToken = process.env.POEDITORTOKEN;
  private readonly projectId = process.env.POEDITORID;
  private readonly projectIdEmail = process.env.POEDITORID_EMAIL;

  constructor(private readonly monitoringService: MonitoringService) {}

  onModuleInit() {
    this.loadTranslations();
    this.initializeGraphAuth();
    this.initEmailTransporter();
  }

  private initEmailTransporter() {
    this.mailTransporter = createTransport({
      host: process.env.EMAIL_HOST_OUTLOOK,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER_OUTLOOK,
        pass: process.env.EMAIL_PASSWORD_OUTLOOK,
      },
      pool: true,
      maxConnections: 1,
      maxMessages: 50,
      rateDelta: 1000,
      rateLimit: 1,
      connectionTimeout: 50000,
      debug: process.env.EMAIL_SMTP_DEBUG === 'true',
      logger: process.env.EMAIL_SMTP_LOGGER === 'true',
    });
  }

  private initializeGraphAuth() {
    this.microsoftAccessToken = process.env.MICROSOFT_ACCESS_TOKEN;
    this.microsoftRefreshToken = process.env.MICROSOFT_REFRESH_TOKEN;
  }

  private async refreshAccessToken() {
    try {
      const response = await axios.post(
        process.env.MICROSOFT_TOKEN_ENDPOINT,
        new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: this.microsoftRefreshToken,
          scope: 'https://graph.microsoft.com/.default',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      this.microsoftAccessToken = response.data.access_token;
      this.microsoftRefreshToken = response.data.refresh_token;
    } catch (error) {
      this.logger.error('Failed to refresh Microsoft Graph token', error);
      throw attachAirbrakeContext(
        ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR),
        {
          failureCategory: 'external-api',
          failureOperation: 'microsoft-graph-token-refresh',
          upstream: 'microsoft-graph',
          upstreamStatus: error?.response?.status ?? null,
          timeout: this.isTimeoutError(error),
        },
      );
    }
  }

  async validateEntity(entity: any): Promise<void> {
    const errors = await validate(entity);
    if (errors.length) {
      const messages = errors.flatMap((error) => Object.values(error.constraints));
      this.logger.error(
        JSON.stringify({
          message: 'Entity validation failed',
          errors: messages,
        }),
      );
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }
  }

  async throwDuplicateError<T>(promise: Promise<T>, _message?: string): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      this.logger.error(error);
      if (error.code === '23505') {
        throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.DATA_ALREADY_EXIST);
      }
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }
  }

  async throwInternalError<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      this.logger.error(error);
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }

  formatName(title: string): string {
    return title
      .trim()
      .replace(/\n/g, ' ')
      .replace(/\s\s+/g, ' ')
      .replace(/\w\S*/g, (w) => w.replace(/^\w/, (l) => l.toUpperCase()));
  }

  generatePointSlug(str: string): string {
    return slugify(str, { lower: true, replacement: '.', remove: /['_\.\-]/g });
  }

  generateMessage(message: string): IMessage {
    return { id: v4(), message };
  }

  error(result_code: number, error: string) {
    return createErrorResponse(result_code, error);
  }

  async sendEmail({
    to,
    subject,
    templateName,
    templateContext,
    from,
    replyTo,
    emailProvider = 'choicetech',
  }: IEmailParams & {
    emailProvider?: 'classtech' | 'oauth' | 'outlook' | 'alfaparf' | 'choicetech' | 'sukoshi';
  }) {
    /* ================= support link ================= */
    const SUPPORT_LINKS: Record<string, string> = {
      chowis: 'https://example.com/',
      choicetech: 'https://example.com/',
      alfaparf: 'https://example.com/',
      classtech: 'https://example.com/',
      outlook: 'https://example.com/',
      sukoshi: 'https://example.com/',
    };

    // sukoshi만 override
    const supportLink =
      emailProvider === 'sukoshi'
        ? 'https://example.com/pages/scan-results-history'
        : SUPPORT_LINKS[emailProvider] || SUPPORT_LINKS.choicetech;

    /* ================= template ================= */
    const templatePath = `${process.env.PUBLIC_FILE}/email-templates/${templateName}.hbs`;
    const compiledTemplate = handlebars.compile(fs.readFileSync(templatePath, 'utf8'));

    const html = compiledTemplate({
      ...templateContext,
      subject,
      supportLink,
      isAlfaparf: emailProvider === 'alfaparf',

      webResultUrl: emailProvider === 'sukoshi' ? supportLink : templateContext.url,
    });

    /* ================= SMTP provider map ================= */
    const SMTP_PROVIDERS: Record<
      string,
      | {
          type: 'custom';
          host: string;
          port: number;
          secure: boolean;
          user: string;
          pass: string;
        }
      | {
          type: 'default'; // outlook
        }
    > = {
      alfaparf: {
        type: 'custom',
        host: process.env.EMAIL_HOST_ALFAPARF,
        port: Number(process.env.EMAIL_PORT_ALFAPARF),
        secure: true,
        user: process.env.EMAIL_USER_ALFAPARF,
        pass: process.env.EMAIL_PASSWORD_ALFAPARF,
      },
      classtech: {
        type: 'custom',
        host: process.env.EMAIL_HOST_CLASSTECH,
        port: Number(process.env.EMAIL_PORT_CLASSTECH),
        secure: true,
        user: process.env.EMAIL_USER_CLASSTECH,
        pass: process.env.EMAIL_PASSWORD_CLASSTECH,
      },
      sukoshi: {
        type: 'custom',
        host: process.env.EMAIL_HOST_SUKOSHI,
        port: Number(process.env.EMAIL_PORT_SUKOSHI),
        secure: true,
        user: process.env.EMAIL_USER_SUKOSHI,
        pass: process.env.EMAIL_PASSWORD_SUKOSHI,
      },
      choicetech: {
        type: 'custom',
        host: process.env.EMAIL_HOST_CHOICETECH,
        port: Number(process.env.EMAIL_PORT_CHOICETECH),
        secure: false,
        user: process.env.EMAIL_USER_CHOICETECH,
        pass: process.env.EMAIL_PASSWORD_CHOICETECH,
      },
      outlook: {
        type: 'default',
      },
    };

    const stopEmailTimer = this.monitoringService.startEmailSendTimer(emailProvider, templateName);

    try {
      const provider = SMTP_PROVIDERS[emailProvider] ?? SMTP_PROVIDERS.choicetech;
      const authenticatedUser =
        provider.type === 'default' ? process.env.EMAIL_USER_OUTLOOK : provider.user;
      const messageOptions = this.buildMailOptions({
        to,
        subject,
        html,
        from,
        replyTo,
        authenticatedUser,
      });

      if (provider.type === 'default') {
        this.logger.log(`Using Outlook SMTP for: ${to}`);

        await this.mailTransporter.sendMail(messageOptions);
        stopEmailTimer('success');
        return;
      }

      this.logger.log(`Using ${emailProvider} SMTP for: ${to}`);

      const transporter = createTransport({
        host: provider.host,
        port: provider.port,
        secure: provider.secure,
        auth: {
          user: provider.user,
          pass: provider.pass,
        },
        connectionTimeout: 10000,
        tls: { rejectUnauthorized: false },
      });

      await transporter.sendMail(messageOptions);
      stopEmailTimer('success');
    } catch (error) {
      stopEmailTimer(this.isTimeoutError(error) ? 'timeout' : 'failure');
      this.logger.error(
        `Failed to send email to ${to} via ${emailProvider}: ${error.message}`,
        error.stack,
      );
      throw attachAirbrakeContext(
        ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR),
        {
          failureCategory: 'email',
          failureOperation: 'email-send',
          provider: emailProvider,
          templateName,
          timeout: this.isTimeoutError(error),
        },
      );
    }
  }

  private isTimeoutError(error: any): boolean {
    return error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED';
  }

  private buildMailOptions({
    to,
    subject,
    html,
    from,
    replyTo,
    authenticatedUser,
  }: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
    authenticatedUser?: string;
  }) {
    const requestedEmail = this.extractEmailAddress(from);
    const requestedDisplayName = this.extractDisplayName(from);
    const normalizedAuthenticatedUser = authenticatedUser?.trim();
    const shouldForceAuthenticatedSender =
      normalizedAuthenticatedUser &&
      requestedEmail &&
      requestedEmail.toLowerCase() !== normalizedAuthenticatedUser.toLowerCase();

    if (shouldForceAuthenticatedSender) {
      this.logger.warn(
        `Overriding from address "${requestedEmail}" with authenticated SMTP user "${normalizedAuthenticatedUser}" to avoid SendAsDenied.`,
      );
    }

    return {
      from:
        requestedDisplayName && normalizedAuthenticatedUser
          ? `"${requestedDisplayName}" <${normalizedAuthenticatedUser}>`
          : from ?? normalizedAuthenticatedUser,
      replyTo: shouldForceAuthenticatedSender ? replyTo ?? from : replyTo,
      to,
      subject,
      html,
    };
  }

  private extractEmailAddress(from?: string): string | undefined {
    if (!from) return undefined;

    const matchedAddress = from.match(/<([^>]+)>/);
    return (matchedAddress?.[1] ?? from).trim();
  }

  private extractDisplayName(from?: string): string | undefined {
    if (!from) return undefined;

    const matchedDisplayName = from.match(/^\s*"?([^"<]+?)"?\s*</);
    return matchedDisplayName?.[1]?.trim() || undefined;
  }

  generateRandomPassword(length: number): string {
    const lc = process.env.LOWERCASE_CHARS;
    const uc = process.env.UPPERCASE_CHARS;
    const nc = process.env.NUMBER_CHARS;
    const all = lc + uc + nc;
    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];

    const pw = [pick(lc), pick(uc), pick(nc)];
    while (pw.length < length) pw.push(pick(all));
    return pw.sort(() => Math.random() - 0.5).join('');
  }

  throwNotFoundError(locale = 'en') {
    throw ErrorExceptionFactory.createFromStatus(
      'notFound',
      ErrorStatus.RECORD_NOT_FOUND,
      undefined,
      locale,
    );
  }

  normalizeTranslationLocale(local?: string) {
    const normalized = (local || 'en').trim();
    if (!normalized) return 'en';

    const lower = normalized.toLowerCase();

    if (lower === 'pt-br' || lower.startsWith('pt-br')) {
      return 'pt-br';
    }

    if (lower.startsWith('pt')) {
      return 'pt';
    }

    if (lower.startsWith('zh')) {
      if (lower.includes('hant') || lower.includes('tw')) {
        return 'zh-Hant';
      }

      return 'zh-Hans';
    }

    const [baseLanguage] = normalized.split(/[-_]/);
    return baseLanguage || 'en';
  }

  getTranslation(local: string) {
    const normalizedLocale = this.normalizeTranslationLocale(local);
    return this.translations[normalizedLocale] || this.translations['en'];
  }

  private loadTranslations() {
    const basePath = path.join(
      process.cwd(),
      'src',
      'common',
      'translation',
      'emailTranslationPoeditor',
    );

    if (!fs.existsSync(basePath)) return;

    const files = fs.readdirSync(basePath);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const lang = file.replace('.json', '').replace('_', '-');
        try {
          const rawContent = JSON.parse(fs.readFileSync(path.join(basePath, file), 'utf8'));

          if (rawContent[lang] && Array.isArray(rawContent[lang])) {
            const flatObj = rawContent[lang].reduce((acc: any, item: any) => {
              if (item.term && item.definition) {
                acc[item.term] = item.definition;
              }
              return acc;
            }, {});

            this.translations[lang] = {
              [lang]: {
                mailers: flatObj,
                ...flatObj,
              },
            };
          } else if (Array.isArray(rawContent)) {
            const flatObj = rawContent.reduce((acc: any, item: any) => {
              if (item.term && item.definition) {
                acc[item.term] = item.definition;
              }
              return acc;
            }, {});

            this.translations[lang] = {
              [lang]: { mailers: flatObj, ...flatObj },
            };
          } else if (rawContent[lang] && !Array.isArray(rawContent[lang])) {
            this.translations[lang] = rawContent;
          } else {
            this.translations[lang] = rawContent;
          }
        } catch (e) {
          this.logger.error(`Failed to load translation for ${lang}: ${e.message}`);
        }
      }
    }
  }

  private async getLanguages(projectId: string) {
    if (!projectId) return [];
    const response = await axios.post(
      `${this.apiUrl}languages/list`,
      {
        api_token: this.apiToken,
        id: projectId,
        options: JSON.stringify([{ unquoted: 1 }]),
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    return response.data.result.languages;
  }

  async fetchTranslation() {
    const results = [];

    if (this.projectId) {
      const langs = await this.getLanguages(this.projectId);
      results.push(...(await this.exportErrorTranslations(langs)));
    }

    if (this.projectIdEmail) {
      const langs = await this.getLanguages(this.projectIdEmail);
      results.push(...(await this.exportEmailTranslations(langs)));
    }

    return results;
  }

  private async exportErrorTranslations(languages: any[]) {
    const dir = path.join(
      process.cwd(),
      'src',
      'common',
      'translation',
      'errorTranslationPoeditor',
    );
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const results = [];
    for (const lang of languages) {
      const exportRes = await axios.post(
        `${this.apiUrl}projects/export`,
        {
          api_token: this.apiToken,
          id: this.projectId,
          language: lang.code,
          type: 'json',
          options: JSON.stringify([{ unquoted: 1 }]),
        },
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const filePath = path.join(dir, `${lang.code}.json`);
      const content = await axios.get(exportRes.data.result.url);
      fs.writeFileSync(filePath, JSON.stringify(content.data, null, 2), 'utf8');
      results.push({ language: lang.code, file: filePath });
    }
    return results;
  }

  private async exportEmailTranslations(languages: any[]) {
    const dir = path.join(
      process.cwd(),
      'src',
      'common',
      'translation',
      'emailTranslationPoeditor',
    );
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const results = [];
    for (const lang of languages) {
      const exportRes = await axios.post(
        `${this.apiUrl}projects/export`,
        {
          api_token: this.apiToken,
          id: this.projectIdEmail,
          language: lang.code,
          type: 'json',
          options: JSON.stringify([{ unquoted: 1 }]),
        },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const filePath = path.join(dir, `${lang.code}.json`);
      const content = await axios.get(exportRes.data.result.url);
      const wrappedContent = { [lang.code]: content.data };
      fs.writeFileSync(filePath, JSON.stringify(wrappedContent, null, 2), 'utf8');
      results.push({ language: lang.code, file: filePath });
    }
    return results;
  }
}
