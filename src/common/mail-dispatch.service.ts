import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { BRAND_CONFIG, BrandConfig, resolveEmailBrandConfig } from '@/src/config/branding.config';
import { CommonService } from './common.service';
import { IEmailParams } from './interfaces/email-params.interface';
import { EMAIL_QUEUE, SEND_EMAIL_JOB } from './mail-queue.constants';
import { EmailProvider, IEmailJob } from './interfaces/email-job.interface';

@Injectable()
export class MailDispatchService implements OnModuleInit {
  private readonly logger = new Logger(MailDispatchService.name);

  constructor(
    private readonly commonService: CommonService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<IEmailJob>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const concurrency = Number(this.configService.get<string>('EMAIL_QUEUE_CONCURRENCY') || 1);

    await this.emailQueue.setGlobalConcurrency(Number.isNaN(concurrency) ? 1 : concurrency);
    this.logger.log(
      `Email queue global concurrency set to ${Number.isNaN(concurrency) ? 1 : concurrency}`,
    );
  }

  resolveBrandConfig(input?: {
    consultantCompanyId?: number | string | null;
    appId?: number | string | null;
    appName?: string | null;
    company?: string | null;
    emailProvider?: string | null;
    fallbackKey?: keyof typeof BRAND_CONFIG;
  }): BrandConfig {
    return resolveEmailBrandConfig(input);
  }

  buildFromAddress(brandConfig: BrandConfig) {
    const sender = brandConfig.senderEmail || process.env.DEFAULT_SENDER_EMAIL;
    if (!sender) {
      return undefined;
    }

    if (brandConfig.omitSenderDisplayName) {
      return sender;
    }

    return `"${brandConfig.displayName || 'ChoiceTech'}" <${sender}>`;
  }

  async sendBrandedEmail(
    params: IEmailParams & {
      consultantCompanyId?: number | string | null;
      appId?: number | string | null;
      appName?: string | null;
      company?: string | null;
      emailProvider?: string | null;
      fallbackKey?: keyof typeof BRAND_CONFIG;
    },
  ) {
    const brandConfig = this.resolveBrandConfig({
      consultantCompanyId: params.consultantCompanyId,
      appId: params.appId,
      appName: params.appName,
      company: params.company,
      emailProvider: params.emailProvider,
      fallbackKey: params.fallbackKey,
    });

    return this.emailQueue.add(
      SEND_EMAIL_JOB,
      {
        to: params.to,
        subject: params.subject,
        templateName: params.templateName,
        templateContext: params.templateContext,
        from: params.from || this.buildFromAddress(brandConfig),
        replyTo: params.replyTo,
        emailProvider: brandConfig.emailProvider as EmailProvider,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
          count: 5000,
        },
      },
    );
  }

  async sendBrandedEmailImmediately(
    params: IEmailParams & {
      consultantCompanyId?: number | string | null;
      appId?: number | string | null;
      appName?: string | null;
      company?: string | null;
      emailProvider?: string | null;
      fallbackKey?: keyof typeof BRAND_CONFIG;
    },
  ) {
    const brandConfig = this.resolveBrandConfig({
      consultantCompanyId: params.consultantCompanyId,
      appId: params.appId,
      appName: params.appName,
      company: params.company,
      emailProvider: params.emailProvider,
      fallbackKey: params.fallbackKey,
    });

    return this.commonService.sendEmail({
      to: params.to,
      subject: params.subject,
      templateName: params.templateName,
      templateContext: params.templateContext,
      from: params.from || this.buildFromAddress(brandConfig),
      replyTo: params.replyTo,
      emailProvider: brandConfig.emailProvider,
    });
  }
}
