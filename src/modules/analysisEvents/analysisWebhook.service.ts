import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { BatchSyncPayload } from './measurement/measurement.types';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import {
  AnalysisWebhookMode,
  AnalysisWebhookResponse,
  AnalysisWebhookValidationResult,
  WebhookValidationIssue,
} from './analysisWebhook.types';

type WebhookContext = {
  source?: string;
  mode?: string;
};

@Injectable()
export class AnalysisWebhookService {
  private readonly logger = new Logger(AnalysisWebhookService.name);
  private readonly allowedSources = this.getAllowedSources();

  async handle(
    payload: BatchSyncPayload,
    context: WebhookContext,
  ): Promise<AnalysisWebhookResponse> {
    const mode = this.normalizeMode(context.mode);
    const source = this.normalizeSource(context.source);
    const validation = this.validatePayload(payload, source, mode);

    if (mode === 'validate') {
      this.logger.log('[WEBHOOK][VALIDATE][DONE]', {
        batch_id: validation.summary.batch_id,
        source: validation.source,
        valid: validation.valid,
      });

      return {
        status: 'validated',
        validation,
      };
    }

    this.assertProcessable(validation);

    const totalMeasurements = validation.summary.total_measurements;

    this.logger.log('[WEBHOOK][HANDLE][ENTER]', {
      batch_id: validation.summary.batch_id,
      source: validation.source,
    });
    this.logger.log('[WEBHOOK][PAYLOAD_SUMMARY]', {
      batch_id: validation.summary.batch_id,
      analysis_db: validation.summary.analysis_db,
      group_count: validation.summary.group_count,
      total_measurements: totalMeasurements,
    });
    this.logger.log('[WEBHOOK][HANDLE][DONE]', {
      batch_id: validation.summary.batch_id,
    });

    return {
      status: 'ok',
      validation,
    };
  }

  private validatePayload(
    payload: BatchSyncPayload,
    source: string | null,
    mode: AnalysisWebhookMode,
  ): AnalysisWebhookValidationResult {
    const issues: WebhookValidationIssue[] = [];
    const batchId = this.toNumberOrNull(payload?.batch_id);
    const analysisDb = this.normalizeString(payload?.analysis_db);
    const customerId = this.toNumberOrNull(payload?.customer?.customer_id);
    const groups = Array.isArray(payload?.measurements) ? payload.measurements : [];

    const allowedSource = this.isSourceAllowed(source);

    if (!source) {
      issues.push({
        code: 'SOURCE_MISSING',
        severity: mode === 'validate' ? 'warning' : 'error',
        path: 'headers.x-analysis-source',
        message: 'x-analysis-source header is missing.',
      });
    } else if (!allowedSource) {
      issues.push({
        code: 'SOURCE_NOT_ALLOWED',
        severity: mode === 'validate' ? 'warning' : 'error',
        path: 'headers.x-analysis-source',
        message: `source ${source} is not allowed.`,
      });
    }

    if (!batchId || batchId <= 0) {
      issues.push({
        code: 'BATCH_ID_MISSING',
        severity: 'error',
        path: 'body.batch_id',
        message: 'batch_id must be a positive number.',
      });
    }

    if (!analysisDb) {
      issues.push({
        code: 'ANALYSIS_DB_MISSING',
        severity: 'error',
        path: 'body.analysis_db',
        message: 'analysis_db is required.',
      });
    }

    if (!customerId || customerId <= 0) {
      issues.push({
        code: 'CUSTOMER_MISSING',
        severity: 'error',
        path: 'body.customer.customer_id',
        message: 'customer.customer_id must be a positive number.',
      });
    }

    if (!groups.length) {
      issues.push({
        code: 'MEASUREMENTS_MISSING',
        severity: 'error',
        path: 'body.measurements',
        message: 'measurements must be a non-empty array.',
      });
    }

    let totalMeasurements = 0;

    groups.forEach((group, groupIndex) => {
      const groupPath = `body.measurements[${groupIndex}]`;
      const typeId = this.toNumberOrNull(group?.type_measurement_id);
      const items = Array.isArray(group?.measurements) ? group.measurements : [];

      if (!typeId || typeId <= 0 || !items.length) {
        issues.push({
          code: 'MEASUREMENT_GROUP_INVALID',
          severity: 'error',
          path: groupPath,
          message:
            'Each measurement group must include a valid type_measurement_id and measurements.',
        });
        return;
      }

      items.forEach((item, itemIndex) => {
        totalMeasurements += 1;
        const itemPath = `${groupPath}.measurements[${itemIndex}]`;
        const measurement = item as Record<string, unknown>;

        if (typeId === 18) {
          const hasSkinAge = measurement.skinAge !== undefined && measurement.skinAge !== null;
          const hasSkinCondition =
            measurement.skinCondition !== undefined && measurement.skinCondition !== null;

          if (!hasSkinAge && !hasSkinCondition) {
            issues.push({
              code: 'MEASUREMENT_VALUE_INVALID',
              severity: 'error',
              path: itemPath,
              message: 'Skin measurements must include skinAge or skinCondition.',
            });
          }

          return;
        }

        if (!this.normalizeString(measurement.nth_analysis)) {
          issues.push({
            code: 'MEASUREMENT_VALUE_INVALID',
            severity: 'error',
            path: itemPath,
            message: 'nth_analysis is required for non-skin measurements.',
          });
        }
      });
    });

    return {
      valid: issues.every((issue) => issue.severity !== 'error'),
      mode,
      source,
      allowed_source: allowedSource,
      summary: {
        batch_id: batchId,
        analysis_db: analysisDb,
        source,
        group_count: groups.length,
        total_measurements: totalMeasurements,
      },
      issues,
    };
  }

  private assertProcessable(validation: AnalysisWebhookValidationResult) {
    const firstError = validation.issues.find((issue) => issue.severity === 'error');

    if (!firstError) {
      return;
    }

    switch (firstError.code) {
      case 'SOURCE_MISSING':
      case 'BATCH_ID_MISSING':
      case 'ANALYSIS_DB_MISSING':
      case 'CUSTOMER_MISSING':
      case 'MEASUREMENT_GROUP_INVALID':
      case 'MEASUREMENT_VALUE_INVALID':
        throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
      case 'MEASUREMENTS_MISSING':
        throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.RECORD_NOT_FOUND);
      case 'SOURCE_NOT_ALLOWED':
        throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
      default:
        throw ErrorExceptionFactory.createFromStatus(
          'http',
          ErrorStatus.SERVER_ERROR,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }

  private normalizeMode(mode?: string): AnalysisWebhookMode {
    return mode?.toLowerCase() === 'validate' ? 'validate' : 'process';
  }

  private normalizeSource(source?: string): string | null {
    const value = source?.trim();

    return value ? value.toUpperCase() : null;
  }

  private isSourceAllowed(source: string | null): boolean {
    if (!source) {
      return false;
    }

    return this.allowedSources.includes(source);
  }

  private getAllowedSources(): string[] {
    const configured = process.env.ANALYSIS_WEBHOOK_ALLOWED_SOURCES;

    if (!configured) {
      return ['CNDP', 'COLLECTOR'];
    }

    return configured
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private normalizeString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
  }
}
