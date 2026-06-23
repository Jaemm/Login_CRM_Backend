import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios from 'axios';

import {
  BatchSyncPayload,
  CollectorAnalysisCompleteRequest,
  CollectorBatchSyncPayload,
  CollectorWebResultPayload,
  MeasurementGroupPayload,
} from './measurement/measurement.types';
import { MeasurementPayloadMapper } from './measurement/measurement.mapper';
import { CollectorMeasurementMapper } from './measurement/collector-measurement.mapper';

import { ErrorStatus } from '@/src/common/constants/error-status';
import { attachAirbrakeContext } from '@/src/common/middleWare/exceptions/exceptionHandling/airbrake-context.util';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { AnalysisDatabaseKey } from '../../common/enums/analysis-server-type.enum';
import { MonitoringService } from '../monitoring/monitoring.service';

@Injectable()
export class AnalysisCompleteService {
  private readonly logger = new Logger(AnalysisCompleteService.name);
  private readonly collectorMeasurementMapper = new CollectorMeasurementMapper();

  constructor(
    @InjectDataSource('cndpHairDB')
    private readonly cndpHairDB: DataSource,

    @InjectDataSource('cndpSkinDB')
    private readonly cndpSkinDB: DataSource,

    @InjectDataSource('cmaHairDB')
    private readonly cmaHairDB: DataSource,

    @InjectDataSource('cmaSkinDB')
    private readonly cmaSkinDB: DataSource,

    @InjectDataSource()
    private readonly loginDB: DataSource,
    private readonly monitoringService: MonitoringService,
  ) {}

  async handleAnalysisComplete(
    batchId: number,
    analysisDb: AnalysisDatabaseKey,
    consultantId?: number,
  ): Promise<void> {
    this.logger.log(
      `[ENTER] batchId=${batchId} analysisDb=${analysisDb} consultantId=${consultantId}`,
    );

    const analysisDS = this.getAnalysisDataSource(analysisDb);

    const analysisRows = await this.query(
      analysisDS,
      'analysis-select',
      `
    SELECT batch_id, customer_id, cbb_completed, end_time, synced_at
    FROM analysis
    WHERE batch_id = $1
    `,
      [batchId],
    );

    if (!analysisRows.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'notFound',
        ErrorStatus.NO_DATA_WITH_THIS_BATCH_ID,
      );
    }

    const analysis = analysisRows[0];

    const customerId = Number(analysis.customer_id);

    this.logger.log(`[ANALYSIS] ${JSON.stringify(analysis)}`);

    const customerRows = await this.query(
      this.loginDB,
      'customer-select',
      `
      SELECT id, name, surname, phone, birth, country_id, email
      FROM customers
      WHERE id = $1
      LIMIT 1
      `,
      [customerId],
    );

    const customer = customerRows[0] ?? null;

    if (!analysis.cbb_completed || !analysis.end_time) {
      throw ErrorExceptionFactory.createFromStatus('conflict', ErrorStatus.INVALID_RECORD);
    }

    if (analysis.synced_at) {
      this.logger.warn(`[SKIP] already synced batchId=${batchId}`);
      return;
    }

    let company = null;

    this.logger.log(`[COMPANY LOOKUP] customer_id=${customerId} consultantId=${consultantId}`);

    if (customerId && customerId !== 0) {
      company = await this.getConsultantCompanyWebhookConfig(customerId);
    } else if (consultantId) {
      company = await this.getConsultantWebhookConfigByConsultantId(consultantId);
    }

    this.logger.log(`[COMPANY RESULT] ${JSON.stringify(company)}`);

    if (!company || !company.is_analysis_webhook || !company.analysis_webhook_url) {
      this.logger.warn(`[SKIP] webhook disabled or company not found`);
      return;
    }

    const rows = await this.query(
      analysisDS,
      'measurements-select',
      `
    SELECT
      m.*,
      tm.name AS type_measurement_name
    FROM measurements m
    LEFT JOIN type_measurements tm
      ON tm.id = m.type_measurement_id
    WHERE m.batch_id = $1
    `,
      [batchId],
    );

    if (!rows.length) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.RECORD_NOT_FOUND);
    }

    this.logger.log(`[MEASUREMENTS] count=${rows.length}`);

    const grouped: Record<number, Record<string, any[]>> = {};

    for (const row of rows) {
      const typeId = Number(row.type_measurement_id);
      const nth = row.args?.nth_analysis ?? 'UNKNOWN';

      if (!grouped[typeId]) grouped[typeId] = {};
      if (!grouped[typeId][nth]) grouped[typeId][nth] = [];

      grouped[typeId][nth].push(row);
    }

    const mapper = new MeasurementPayloadMapper();
    const measurementGroups: MeasurementGroupPayload[] = [];

    for (const [typeId, nthMap] of Object.entries(grouped)) {
      const measurements = Object.entries(nthMap).map(([nth, nthRows]) => mapper.map(nth, nthRows));

      const firstRow = nthMap[Object.keys(nthMap)[0]][0];

      measurementGroups.push({
        type_measurement_id: Number(typeId),
        type_measurement_name: firstRow?.type_measurement_name ?? null,
        measurements,
      });
    }

    const payload: BatchSyncPayload = {
      batch_id: batchId,
      analysis_db: analysisDb,
      customer: {
        customer_id: customerId,
        name: customer?.name ?? null,
        surname: customer?.surname ?? null,
        phone: customer?.phone ?? null,
        birth: customer?.birth ?? null,
        country_id: customer?.country_id ?? null,
        email: customer?.email ?? null,
      },
      measurements: measurementGroups,
    };
    const source = this.resolveSourceHeader(analysisDb);
    const stopWebhookTimer = this.monitoringService.startAnalysisWebhookTimer(source);

    try {
      this.logger.log(
        `[WEBHOOK PAYLOAD] batchId=${payload.batch_id} analysisDb=${payload.analysis_db} groups=${payload.measurements.length}`,
      );

      await axios.post(company.analysis_webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Analysis-Source': source,
        },
        timeout: 10000,
      });

      await this.query(
        analysisDS,
        'analysis-update-synced',
        `
      UPDATE analysis
      SET synced_at = NOW()
      WHERE batch_id = $1
        AND synced_at IS NULL
      `,
        [batchId],
      );

      stopWebhookTimer('success');
      this.logger.log(`[DONE] webhook sent batchId=${batchId}`);
    } catch (err) {
      stopWebhookTimer(this.isTimeoutError(err) ? 'timeout' : 'failure');
      this.logger.error(
        `[WEBHOOK FAILED] batchId=${batchId}`,
        JSON.stringify({
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
        }),
      );
      throw attachAirbrakeContext(
        ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR),
        {
          failureCategory: 'webhook',
          failureOperation: 'analysis-webhook-delivery',
          upstream: 'consultant-company-webhook',
          analysisSource: source,
          upstreamStatus: err?.response?.status ?? null,
          timeout: this.isTimeoutError(err),
        },
      );
    }
  }

  async handleCollectorAnalysisComplete(payload: CollectorAnalysisCompleteRequest): Promise<void> {
    const batchId = Number(payload.batch_id);
    const customerId = this.toOptionalNumber(payload.customer_id);
    const consultantId = this.toOptionalNumber(payload.consultant_id);

    this.logger.log(
      `[COLLECTOR][ENTER] batchId=${batchId} customerId=${customerId} consultantId=${consultantId}`,
    );

    if (!batchId || (!customerId && !consultantId)) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const collectorBaseUrl = process.env.ANALYSIS_COLLECTOR_URL;

    if (!collectorBaseUrl) {
      this.logger.error('[COLLECTOR][CONFIG] ANALYSIS_COLLECTOR_URL is not configured');
      throw attachAirbrakeContext(
        ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR),
        {
          failureCategory: 'configuration',
          failureOperation: 'analysis-collector-webhook',
          missingConfig: 'ANALYSIS_COLLECTOR_URL',
        },
      );
    }

    const customer = customerId ? await this.getCustomer(customerId) : null;
    let company = customerId ? await this.getConsultantCompanyWebhookConfig(customerId) : null;

    if (!company && consultantId) {
      company = await this.getConsultantWebhookConfigByConsultantId(consultantId);
    }

    this.logger.log(`[COLLECTOR][COMPANY RESULT] ${JSON.stringify(company)}`);

    if (!company || !company.is_analysis_webhook || !company.analysis_webhook_url) {
      this.logger.warn(`[COLLECTOR][SKIP] webhook disabled or company not found`);
      return;
    }

    const collectorResult = await this.fetchCollectorResult(collectorBaseUrl, batchId);
    const collectorMeasurements = this.collectorMeasurementMapper.map(collectorResult);
    const deliveryPayload: CollectorBatchSyncPayload = {
      batch_id: batchId,
      analysis_db: 'analysis_collector',
      source: 'COLLECTOR',
      customer: {
        customer_id: customerId ?? 0,
        name: customer?.name ?? null,
        surname: customer?.surname ?? null,
        phone: customer?.phone ?? null,
        birth: customer?.birth ?? null,
        country_id: customer?.country_id ?? null,
        email: customer?.email ?? null,
      },
      measurements: collectorMeasurements,
      collector: {
        analysis_type: payload.analysis_type ?? null,
        app_id: payload.app_id ?? null,
        image_urls: Array.isArray(collectorResult.image_urls) ? collectorResult.image_urls : [],
        results: collectorResult.results ?? {},
        analysis_comment: collectorResult.analysis_comment ?? null,
      },
    };
    const source = 'COLLECTOR';
    const stopWebhookTimer = this.monitoringService.startAnalysisWebhookTimer(source);

    try {
      this.logger.log(
        `[COLLECTOR][WEBHOOK PAYLOAD] batchId=${deliveryPayload.batch_id} imageCount=${deliveryPayload.collector.image_urls.length} measurementGroups=${deliveryPayload.measurements.length}`,
      );

      await axios.post(company.analysis_webhook_url, deliveryPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Analysis-Source': source,
        },
        timeout: 10000,
      });

      stopWebhookTimer('success');
      this.logger.log(`[COLLECTOR][DONE] webhook sent batchId=${batchId}`);
    } catch (err) {
      stopWebhookTimer(this.isTimeoutError(err) ? 'timeout' : 'failure');
      this.logger.error(
        `[COLLECTOR][WEBHOOK FAILED] batchId=${batchId}`,
        JSON.stringify({
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
        }),
      );
      throw attachAirbrakeContext(
        ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR),
        {
          failureCategory: 'webhook',
          failureOperation: 'analysis-collector-webhook-delivery',
          upstream: 'consultant-company-webhook',
          analysisSource: source,
          upstreamStatus: err?.response?.status ?? null,
          timeout: this.isTimeoutError(err),
        },
      );
    }
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isTimeoutError(error: any): boolean {
    return error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED';
  }

  private resolveSourceHeader(dbKey: AnalysisDatabaseKey): string {
    if (
      dbKey === AnalysisDatabaseKey.ANALYSIS_CNDP_HAIR ||
      dbKey === AnalysisDatabaseKey.ANALYSIS_CNDP_SKIN
    ) {
      return 'CNDP';
    }

    if (
      dbKey === AnalysisDatabaseKey.ANALYSIS_CMA_HAIR ||
      dbKey === AnalysisDatabaseKey.ANALYSIS_CMA_SKIN
    ) {
      return 'CMA';
    }

    return 'UNKNOWN';
  }

  private async fetchCollectorResult(
    collectorBaseUrl: string,
    batchId: number,
  ): Promise<CollectorWebResultPayload> {
    const collectorUrl = `${collectorBaseUrl.replace(/\/+$/, '')}/analysis/web/results/${batchId}`;

    try {
      const response = await axios.get<
        CollectorWebResultPayload | { data?: CollectorWebResultPayload }
      >(collectorUrl, {
        timeout: 10000,
      });

      if (
        response.data &&
        typeof response.data === 'object' &&
        'data' in response.data &&
        response.data.data
      ) {
        return response.data.data;
      }

      return response.data as CollectorWebResultPayload;
    } catch (err) {
      this.logger.error(
        `[COLLECTOR][FETCH FAILED] batchId=${batchId}`,
        JSON.stringify({
          message: err?.message,
          status: err?.response?.status,
          data: err?.response?.data,
        }),
      );
      throw attachAirbrakeContext(
        ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR),
        {
          failureCategory: 'upstream',
          failureOperation: 'analysis-collector-result-fetch',
          upstream: 'analysis-collector',
          upstreamStatus: err?.response?.status ?? null,
          timeout: this.isTimeoutError(err),
        },
      );
    }
  }

  private getAnalysisDataSource(dbKey: AnalysisDatabaseKey): DataSource {
    const map: Partial<Record<AnalysisDatabaseKey, DataSource>> = {
      [AnalysisDatabaseKey.ANALYSIS_CNDP_HAIR]: this.cndpHairDB,
      [AnalysisDatabaseKey.ANALYSIS_CNDP_SKIN]: this.cndpSkinDB,
      [AnalysisDatabaseKey.ANALYSIS_CMA_HAIR]: this.cmaHairDB,
      [AnalysisDatabaseKey.ANALYSIS_CMA_SKIN]: this.cmaSkinDB,
    };

    const dataSource = map[dbKey];

    if (!dataSource) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    return dataSource;
  }

  private async getConsultantWebhookConfigByConsultantId(consultantId: number) {
    const rows = await this.query(
      this.loginDB,
      'consultant-company-select-by-consultant',
      `
      SELECT cc.id, cc.is_analysis_webhook, cc.analysis_webhook_url
      FROM consultants cs
      JOIN consultant_companies cc
        ON cc.id = cs.consultant_company_id
      WHERE cs.id = $1
      LIMIT 1
      `,
      [consultantId],
    );

    return rows[0] ?? null;
  }

  private async getConsultantCompanyWebhookConfig(customerId: number) {
    const rows = await this.query(
      this.loginDB,
      'consultant-company-select',
      `
      SELECT cc.id, cc.is_analysis_webhook, cc.analysis_webhook_url
      FROM customers c
      JOIN consultants cs ON cs.id = c.consultant_id
      JOIN consultant_companies cc ON cc.id = cs.consultant_company_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [customerId],
    );

    return rows[0] ?? null;
  }

  private async getCustomer(customerId: number) {
    const rows = await this.query(
      this.loginDB,
      'customer-select',
      `
      SELECT id, name, surname, phone, birth, country_id, email
      FROM customers
      WHERE id = $1
      LIMIT 1
      `,
      [customerId],
    );

    return rows[0] ?? null;
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async query(dataSource: DataSource, label: string, sql: string, params: any[]) {
    try {
      return await dataSource.query(sql, params);
    } catch (err) {
      this.logger.error(`[DB FAIL] ${label}`, err?.message);
      throw err;
    }
  }
}
