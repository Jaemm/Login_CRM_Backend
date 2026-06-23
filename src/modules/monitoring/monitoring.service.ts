import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

type AuthResult = 'success' | 'failure';
type AuthFlow = 'social' | 'standard';
type CronResult = 'success' | 'failure';
type ExternalResult = 'success' | 'failure' | 'timeout';
type S3Result = 'success' | 'failure' | 'not_found';

type ProductUsageSnapshot = {
  applicationId: string;
  application: string;
  countryCode: string;
  country: string;
  activeProducts: number;
};

@Injectable()
export class MonitoringService {
  private readonly authLoginCounter: Counter<string>;
  private readonly tokenRefreshCounter: Counter<string>;
  private readonly analysisApiCounter: Counter<string>;
  private readonly analysisApiDuration: Histogram<string>;
  private readonly analysisWebhookCounter: Counter<string>;
  private readonly analysisWebhookDuration: Histogram<string>;
  private readonly emailSendCounter: Counter<string>;
  private readonly emailSendDuration: Histogram<string>;
  private readonly cronRunsCounter: Counter<string>;
  private readonly cronDuration: Histogram<string>;
  private readonly cronLastSuccessGauge: Gauge<string>;
  private readonly s3RequestCounter: Counter<string>;
  private readonly s3RequestDuration: Histogram<string>;
  private readonly productActiveUsageGauge: Gauge<string>;

  constructor() {
    this.authLoginCounter = this.getOrCreateCounter('login_crm_auth_login_total', {
      help: 'Total consultant login attempts',
      labelNames: ['result', 'flow', 'role'],
    });

    this.tokenRefreshCounter = this.getOrCreateCounter('login_crm_token_refresh_total', {
      help: 'Total token refresh attempts',
      labelNames: ['result', 'role'],
    });

    this.analysisApiCounter = this.getOrCreateCounter('login_crm_analysis_api_requests_total', {
      help: 'Total outbound analysis API requests',
      labelNames: ['analysis_type', 'result'],
    });

    this.analysisApiDuration = this.getOrCreateHistogram(
      'login_crm_analysis_api_duration_seconds',
      {
        help: 'Duration of outbound analysis API requests',
        labelNames: ['analysis_type', 'result'],
      },
    );

    this.analysisWebhookCounter = this.getOrCreateCounter('login_crm_analysis_webhook_total', {
      help: 'Total analysis webhook delivery attempts',
      labelNames: ['result', 'source'],
    });

    this.analysisWebhookDuration = this.getOrCreateHistogram(
      'login_crm_analysis_webhook_duration_seconds',
      {
        help: 'Duration of analysis webhook deliveries',
        labelNames: ['result', 'source'],
      },
    );

    this.emailSendCounter = this.getOrCreateCounter('login_crm_email_send_total', {
      help: 'Total email send attempts',
      labelNames: ['provider', 'template', 'result'],
    });

    this.emailSendDuration = this.getOrCreateHistogram('login_crm_email_send_duration_seconds', {
      help: 'Duration of email send attempts',
      labelNames: ['provider', 'template', 'result'],
    });

    this.cronRunsCounter = this.getOrCreateCounter('login_crm_cron_runs_total', {
      help: 'Total cron executions',
      labelNames: ['job', 'result'],
    });

    this.cronDuration = this.getOrCreateHistogram('login_crm_cron_duration_seconds', {
      help: 'Duration of cron executions',
      labelNames: ['job', 'result'],
    });

    this.cronLastSuccessGauge = this.getOrCreateGauge(
      'login_crm_cron_last_success_timestamp_seconds',
      {
        help: 'Unix timestamp of the last successful cron execution',
        labelNames: ['job'],
      },
    );

    this.s3RequestCounter = this.getOrCreateCounter('login_crm_s3_requests_total', {
      help: 'Total S3 requests',
      labelNames: ['operation', 'result'],
    });

    this.s3RequestDuration = this.getOrCreateHistogram(
      'login_crm_s3_request_duration_seconds',
      {
        help: 'Duration of S3 requests',
        labelNames: ['operation', 'result'],
      },
    );

    this.productActiveUsageGauge = this.getOrCreateGauge('login_crm_product_active_usage', {
      help: 'Current active product usage grouped by application and country',
      labelNames: ['application_id', 'application', 'country_code', 'country'],
    });
  }

  recordAuthLogin(result: AuthResult, flow: AuthFlow, role = 'consultant') {
    this.authLoginCounter.labels(result, flow, role).inc();
  }

  recordTokenRefresh(result: AuthResult, role = 'consultant') {
    this.tokenRefreshCounter.labels(result, role).inc();
  }

  startAnalysisApiTimer(analysisType: string) {
    const startedAt = process.hrtime.bigint();

    return (result: ExternalResult) => {
      const durationSeconds = this.getDurationSeconds(startedAt);
      this.analysisApiCounter.labels(analysisType, result).inc();
      this.analysisApiDuration.labels(analysisType, result).observe(durationSeconds);
    };
  }

  startAnalysisWebhookTimer(source: string) {
    const startedAt = process.hrtime.bigint();

    return (result: ExternalResult) => {
      const durationSeconds = this.getDurationSeconds(startedAt);
      this.analysisWebhookCounter.labels(result, source).inc();
      this.analysisWebhookDuration.labels(result, source).observe(durationSeconds);
    };
  }

  startEmailSendTimer(provider: string, template: string) {
    const startedAt = process.hrtime.bigint();

    return (result: ExternalResult) => {
      const durationSeconds = this.getDurationSeconds(startedAt);
      this.emailSendCounter.labels(provider, template, result).inc();
      this.emailSendDuration.labels(provider, template, result).observe(durationSeconds);
    };
  }

  startCronTimer(job: string) {
    const startedAt = process.hrtime.bigint();

    return (result: CronResult) => {
      const durationSeconds = this.getDurationSeconds(startedAt);
      this.cronRunsCounter.labels(job, result).inc();
      this.cronDuration.labels(job, result).observe(durationSeconds);

      if (result === 'success') {
        this.cronLastSuccessGauge.labels(job).set(Date.now() / 1000);
      }
    };
  }

  startS3Timer(operation: string) {
    const startedAt = process.hrtime.bigint();

    return (result: S3Result) => {
      const durationSeconds = this.getDurationSeconds(startedAt);
      this.s3RequestCounter.labels(operation, result).inc();
      this.s3RequestDuration.labels(operation, result).observe(durationSeconds);
    };
  }

  recordProductUsageSnapshot(rows: ProductUsageSnapshot[]) {
    this.productActiveUsageGauge.reset();

    rows.forEach((row) => {
      this.productActiveUsageGauge
        .labels(row.applicationId, row.application, row.countryCode, row.country)
        .set(row.activeProducts);
    });
  }

  private getDurationSeconds(startedAt: bigint): number {
    return Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
  }

  private getOrCreateCounter(
    name: string,
    config: { help: string; labelNames: string[] },
  ): Counter<string> {
    const existing = register.getSingleMetric(name);

    if (existing) {
      return existing as Counter<string>;
    }

    const metric = new Counter({
      name,
      help: config.help,
      labelNames: config.labelNames,
    });

    register.registerMetric(metric);
    return metric;
  }

  private getOrCreateHistogram(
    name: string,
    config: { help: string; labelNames: string[] },
  ): Histogram<string> {
    const existing = register.getSingleMetric(name);

    if (existing) {
      return existing as Histogram<string>;
    }

    const metric = new Histogram({
      name,
      help: config.help,
      labelNames: config.labelNames,
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    });

    register.registerMetric(metric);
    return metric;
  }

  private getOrCreateGauge(
    name: string,
    config: { help: string; labelNames: string[] },
  ): Gauge<string> {
    const existing = register.getSingleMetric(name);

    if (existing) {
      return existing as Gauge<string>;
    }

    const metric = new Gauge({
      name,
      help: config.help,
      labelNames: config.labelNames,
    });

    register.registerMetric(metric);
    return metric;
  }
}
