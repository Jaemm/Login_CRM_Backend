import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import axios from 'axios';

import {
  BatchSyncPayload,
  CollectorBatchSyncPayload,
  CollectorWebResultPayload,
  MeasurementGroupPayload,
} from './measurement/measurement.types';
import { CollectorMeasurementMapper } from './measurement/collector-measurement.mapper';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import {
  AnalysisServerType,
  AnalysisDatabaseKey,
} from '../../common/enums/analysis-server-type.enum';

@Injectable()
export class AnalysisQueryService {
  private readonly logger = new Logger(AnalysisQueryService.name);
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
  ) {}

  async getBatchAnalysis(
    serverType: AnalysisServerType,
    batchId: number,
    analysisToken: string,
  ): Promise<BatchSyncPayload | CollectorBatchSyncPayload> {
    this.logger.log('[ENTER][analysis-query-service]', {
      serverType,
      batchId,
    });

    if (serverType === AnalysisServerType.COLLECTOR) {
      return this.getCollectorBatchAnalysis(batchId, analysisToken);
    }

    const ds = this.getDataSource(serverType);

    /* 1. token → company */
    const companyRows = await this.loginDB.query(
      `
      SELECT id
      FROM consultant_companies
      WHERE analysis_token = $1
        AND analysis_token_active = true
      LIMIT 1
      `,
      [analysisToken],
    );

    if (!companyRows.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.PERMISSION_DENIED,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const requesterCompanyId = Number(companyRows[0].id);

    /* 2. batch → customer */
    const analysisRows = await ds.query(
      `
      SELECT customer_id, end_time
      FROM analysis
      WHERE batch_id = $1
        AND cbb_completed = true
        AND end_time IS NOT NULL
      LIMIT 1
      `,
      [batchId],
    );

    if (!analysisRows.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.NO_DATA_WITH_THIS_BATCH_ID,
        HttpStatus.NOT_FOUND,
      );
    }

    const { customer_id, end_time } = analysisRows[0];

    /* 3. 7일 유지 정책 */
    const diffDays = (Date.now() - new Date(end_time).getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.NO_DATA_WITH_THIS_BATCH_ID,
        HttpStatus.GONE,
      );
    }

    /* 4. batch 소유 회사 검증 */
    const ownerRows = await this.loginDB.query(
      `
      SELECT cc.id
      FROM customers c
      JOIN consultants cs ON cs.id = c.consultant_id
      JOIN consultant_companies cc ON cc.id = cs.consultant_company_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [customer_id],
    );

    if (!ownerRows.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.RECORD_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (Number(ownerRows[0].id) !== requesterCompanyId) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.PERMISSION_DENIED,
        HttpStatus.FORBIDDEN,
      );
    }

    /* 4-1. customer 정보 조회 */
    const customerRows = await this.loginDB.query(
      `
      SELECT
        id AS customer_id,
        surname,
        CONCAT_WS(' ', name, surname) AS full_name,
        phone,
        birth,
        country_id,
        email
      FROM customers
      WHERE id = $1
      LIMIT 1
      `,
      [customer_id],
    );

    const customerInfo = customerRows.length
      ? {
          customer_id: Number(customerRows[0].customer_id),
          name: customerRows[0].full_name || null,
          surname: customerRows[0].surname ?? null,
          phone: customerRows[0].phone ?? null,
          birth: customerRows[0].birth ?? null,
          country_id: customerRows[0].country_id ?? null,
          email: customerRows[0].email ?? null,
        }
      : {
          customer_id: Number(customer_id),
          name: null,
          surname: null,
          phone: null,
          birth: null,
          country_id: null,
          email: null,
        };

    /* 5. measurements 조회 */
    const rows = await ds.query(
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
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.NO_DATA_WITH_THIS_BATCH_ID,
        HttpStatus.NOT_FOUND,
      );
    }

    const normalizeUrl = (url: string | null) => {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      return `https://${url}`;
    };

    /* 6. grouping */
    type GroupedMeasurement = {
      scoreRow: any | null;
      originalImage: string | null;
      analyzedImage: string | null;
      typeName: string | null;
    };

    const grouped: Record<number, Record<string, GroupedMeasurement>> = {};

    for (const row of rows) {
      const typeId = Number(row.type_measurement_id);
      const nth = row.args?.nth_analysis ?? 'UNKNOWN';

      if (!grouped[typeId]) grouped[typeId] = {};
      if (!grouped[typeId][nth]) {
        grouped[typeId][nth] = {
          scoreRow: null,
          originalImage: null,
          analyzedImage: null,
          typeName: row.type_measurement_name ?? null,
        };
      }

      // 이미지 구분
      if (row.type_image_id === 21) {
        grouped[typeId][nth].originalImage = normalizeUrl(row.url);
        grouped[typeId][nth].scoreRow = row;
      } else if (row.type_image_id === 18) {
        grouped[typeId][nth].analyzedImage = normalizeUrl(row.url);
      }
    }

    /* 7. payload 생성 */
    const measurementGroups: MeasurementGroupPayload[] = [];

    for (const [typeIdStr, nthMap] of Object.entries(grouped)) {
      const typeId = Number(typeIdStr);

      const measurements = Object.entries(nthMap).map(([nth, data]) => {
        const scores = data.scoreRow?.scores;

        // skinCondition / skinAge 전용 구조
        if (typeId === 18) {
          return {
            skinAge: scores?.skinAge ?? null,
            skinCondition: scores?.skinCondition ?? null,
          };
        }

        // 일반 타입
        return {
          nth_analysis: nth,
          raw: toNumberOrNull(scores?.raw),
          score: toNumberOrNull(scores?.score),
          computation_score: toNumberOrNull(scores?.computation_score),
          keyword: scores?.keyWord ?? null,
          originalImage: data.originalImage,
          analysisImage: data.analyzedImage,
        };
      });

      const firstData = Object.values(nthMap)[0];

      measurementGroups.push({
        type_measurement_id: typeId,
        type_measurement_name: firstData?.typeName ?? null,
        measurements,
      });
    }

    return {
      batch_id: batchId,
      analysis_db: this.getAnalysisDbKey(serverType),
      customer: customerInfo,
      measurements: measurementGroups,
    };
  }

  async getBatchList(serverType: AnalysisServerType, analysisToken: string, limit: number) {
    if (serverType === AnalysisServerType.COLLECTOR) {
      return this.getCollectorBatchList(analysisToken, limit);
    }

    const analysisDS = this.getDataSource(serverType);

    /* 1. token → company */
    const companyRows = await this.loginDB.query(
      `
    SELECT id
    FROM consultant_companies
    WHERE analysis_token = $1
      AND analysis_token_active = true
    LIMIT 1
    `,
      [analysisToken],
    );

    if (!companyRows.length) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.PERMISSION_DENIED);
    }

    const companyId = Number(companyRows[0].id);

    /* 2. company → customers */
    const customerRows = await this.loginDB.query(
      `
    SELECT c.id
    FROM customers c
    JOIN consultants cs ON cs.id = c.consultant_id
    WHERE cs.consultant_company_id = $1
    `,
      [companyId],
    );

    if (!customerRows.length) {
      return {
        server_type: serverType,
        count: 0,
        batches: [],
      };
    }

    const customerIds = customerRows.map((r: any) => Number(r.id));

    /* 3. analysis 조회 */
    const rows = await analysisDS.query(
      `
    SELECT batch_id, customer_id, end_time, synced_at
    FROM analysis
    WHERE customer_id = ANY($1)
      AND cbb_completed = true
      AND end_time IS NOT NULL
      AND end_time >= NOW() - INTERVAL '7 days'
    ORDER BY end_time DESC
    LIMIT $2
    `,
      [customerIds, limit],
    );

    if (!rows.length) {
      return {
        server_type: serverType,
        count: 0,
        batches: [],
      };
    }

    /* 4. batch에 포함된 customer id 수집 */
    const batchCustomerIds = [...new Set(rows.map((r: any) => Number(r.customer_id)))];

    /* 5. customer 상세 조회 */
    const customers = await this.loginDB.query(
      `
      SELECT
        id AS customer_id,
        surname,
        CONCAT_WS(' ', name, surname) AS full_name,
        phone,
        birth,
        country_id,
        email
      FROM customers
      WHERE id = ANY($1)
      `,
      [batchCustomerIds],
    );

    const customerMap = new Map<number, any>();

    for (const c of customers) {
      const id = Number(c.customer_id);

      customerMap.set(id, {
        customer_id: id,
        name: c.full_name || null,
        surname: c.surname ?? null,
        phone: c.phone ?? null,
        birth: c.birth ?? null,
        country_id: c.country_id ?? null,
        email: c.email ?? null,
      });
    }

    /* 6. customer 붙이기 */
    const enrichedRows = rows.map((row: any) => {
      const customerId = Number(row.customer_id);

      return {
        batch_id: row.batch_id,
        end_time: row.end_time,
        synced_at: row.synced_at,
        customer: customerMap.get(customerId) ?? {
          customer_id: customerId,
          name: null,
          surname: null,
          phone: null,
          birth: null,
          country_id: null,
          email: null,
        },
      };
    });

    return {
      server_type: serverType,
      count: enrichedRows.length,
      batches: enrichedRows,
    };
  }

  private getDataSource(serverType: AnalysisServerType): DataSource {
    const map: Partial<Record<AnalysisServerType, DataSource>> = {
      [AnalysisServerType.HAIR]: this.cndpHairDB,
      [AnalysisServerType.SKIN]: this.cndpSkinDB,
      [AnalysisServerType.CMA_HAIR]: this.cmaHairDB,
      [AnalysisServerType.CMA_SKIN]: this.cmaSkinDB,
    };

    const ds = map[serverType];

    if (!ds) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.BAD_REQUEST,
        HttpStatus.BAD_REQUEST,
      );
    }

    return ds;
  }

  private getAnalysisDbKey(serverType: AnalysisServerType): AnalysisDatabaseKey {
    const map: Record<AnalysisServerType, AnalysisDatabaseKey> = {
      [AnalysisServerType.HAIR]: AnalysisDatabaseKey.ANALYSIS_CNDP_HAIR,
      [AnalysisServerType.SKIN]: AnalysisDatabaseKey.ANALYSIS_CNDP_SKIN,
      [AnalysisServerType.CMA_HAIR]: AnalysisDatabaseKey.ANALYSIS_CMA_HAIR,
      [AnalysisServerType.CMA_SKIN]: AnalysisDatabaseKey.ANALYSIS_CMA_SKIN,
      [AnalysisServerType.COLLECTOR]: AnalysisDatabaseKey.ANALYSIS_COLLECTOR,
    };

    return map[serverType];
  }

  private async getCollectorBatchAnalysis(
    batchId: number,
    analysisToken: string,
  ): Promise<CollectorBatchSyncPayload> {
    const companyId = await this.getCompanyIdByAnalysisToken(analysisToken);
    const collectorResult = await this.fetchCollectorInternalResult(batchId);
    const customerId = toNumberOrNull(collectorResult.customer_id);
    const consultantId = toNumberOrNull(collectorResult.consultant_id);

    await this.assertCollectorBatchOwnedByCompany(customerId, consultantId, companyId);

    const customer = customerId ? await this.getCustomer(customerId) : null;
    const measurements = this.collectorMeasurementMapper.map(collectorResult);

    return {
      batch_id: batchId,
      analysis_db: AnalysisDatabaseKey.ANALYSIS_COLLECTOR,
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
      measurements,
      collector: {
        analysis_type: collectorResult.analysis_type ?? null,
        app_id: collectorResult.app_id ?? null,
        image_urls: Array.isArray(collectorResult.image_urls) ? collectorResult.image_urls : [],
        results: collectorResult.results ?? {},
        analysis_comment: collectorResult.analysis_comment ?? null,
      },
    };
  }

  private async getCollectorBatchList(analysisToken: string, limit: number) {
    const companyId = await this.getCompanyIdByAnalysisToken(analysisToken);
    const customerRows = await this.loginDB.query(
      `
      SELECT c.id
      FROM customers c
      JOIN consultants cs ON cs.id = c.consultant_id
      WHERE cs.consultant_company_id = $1
      `,
      [companyId],
    );
    const consultantRows = await this.loginDB.query(
      `
      SELECT id
      FROM consultants
      WHERE consultant_company_id = $1
      `,
      [companyId],
    );
    const customerIds = customerRows.map((row: any) => Number(row.id));
    const consultantIds = consultantRows.map((row: any) => Number(row.id));

    const collectorResponse = await this.fetchCollectorInternalBatchList(
      customerIds,
      consultantIds,
      limit,
    );

    const customerMap = await this.getCustomersById(
      collectorResponse.batches
        .map((batch) => toNumberOrNull(batch.customer_id))
        .filter((id): id is number => id !== null),
    );

    return {
      server_type: AnalysisServerType.COLLECTOR,
      count: collectorResponse.batches.length,
      batches: collectorResponse.batches.map((batch) => {
        const customerId = toNumberOrNull(batch.customer_id);

        return {
          batch_id: batch.batch_id,
          end_time: batch.synced_at ?? batch.created_at ?? null,
          synced_at: batch.synced_at ?? null,
          analysis_type: batch.analysis_type ?? null,
          app_id: batch.app_id ?? null,
          customer:
            customerId && customerMap.has(customerId)
              ? customerMap.get(customerId)
              : {
                  customer_id: customerId ?? 0,
                  name: null,
                  surname: null,
                  phone: null,
                  birth: null,
                  country_id: null,
                  email: null,
                },
        };
      }),
    };
  }

  private async getCompanyIdByAnalysisToken(analysisToken: string): Promise<number> {
    const companyRows = await this.loginDB.query(
      `
      SELECT id
      FROM consultant_companies
      WHERE analysis_token = $1
        AND analysis_token_active = true
      LIMIT 1
      `,
      [analysisToken],
    );

    if (!companyRows.length) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.PERMISSION_DENIED,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return Number(companyRows[0].id);
  }

  private async assertCollectorBatchOwnedByCompany(
    customerId: number | null,
    consultantId: number | null,
    companyId: number,
  ) {
    if (customerId) {
      const ownerRows = await this.loginDB.query(
        `
        SELECT cc.id
        FROM customers c
        JOIN consultants cs ON cs.id = c.consultant_id
        JOIN consultant_companies cc ON cc.id = cs.consultant_company_id
        WHERE c.id = $1
        LIMIT 1
        `,
        [customerId],
      );

      if (ownerRows.length && Number(ownerRows[0].id) === companyId) {
        return;
      }
    }

    if (consultantId) {
      const ownerRows = await this.loginDB.query(
        `
        SELECT consultant_company_id
        FROM consultants
        WHERE id = $1
        LIMIT 1
        `,
        [consultantId],
      );

      if (ownerRows.length && Number(ownerRows[0].consultant_company_id) === companyId) {
        return;
      }
    }

    throw ErrorExceptionFactory.createFromStatus(
      'http',
      ErrorStatus.PERMISSION_DENIED,
      HttpStatus.FORBIDDEN,
    );
  }

  private async getCustomer(customerId: number) {
    const customers = await this.getCustomersById([customerId]);
    return customers.get(customerId) ?? null;
  }

  private async getCustomersById(customerIds: number[]) {
    const uniqueCustomerIds = [...new Set(customerIds)];
    const customerMap = new Map<number, any>();

    if (!uniqueCustomerIds.length) {
      return customerMap;
    }

    const customers = await this.loginDB.query(
      `
      SELECT id AS customer_id, name, surname, phone, birth, country_id, email
      FROM customers
      WHERE id = ANY($1)
      `,
      [uniqueCustomerIds],
    );

    for (const customer of customers) {
      const id = Number(customer.customer_id);

      customerMap.set(id, {
        customer_id: id,
        name: customer.name ?? null,
        surname: customer.surname ?? null,
        phone: customer.phone ?? null,
        birth: customer.birth ?? null,
        country_id: customer.country_id ?? null,
        email: customer.email ?? null,
      });
    }

    return customerMap;
  }

  private async fetchCollectorInternalResult(batchId: number) {
    const collectorBaseUrl = this.getCollectorBaseUrl();
    const response = await axios.get<
      | (CollectorWebResultPayload & CollectorInternalBatchMetadata)
      | { data?: CollectorWebResultPayload & CollectorInternalBatchMetadata }
    >(`${collectorBaseUrl}/internal/analysis/batches/${batchId}/webhook-result`, {
      headers: this.getCollectorInternalHeaders(),
      timeout: 10000,
    });

    return this.unwrapCollectorResponse(response.data);
  }

  private async fetchCollectorInternalBatchList(
    customerIds: number[],
    consultantIds: number[],
    limit: number,
  ): Promise<{ batches: CollectorInternalBatchMetadata[] }> {
    const collectorBaseUrl = this.getCollectorBaseUrl();
    const response = await axios.post<
      | { batches: CollectorInternalBatchMetadata[] }
      | { data?: { batches: CollectorInternalBatchMetadata[] } }
    >(
      `${collectorBaseUrl}/internal/analysis/batches/search`,
      {
        customer_ids: customerIds,
        consultant_ids: consultantIds,
        limit: Math.min(Math.max(limit, 1), 100),
      },
      {
        headers: this.getCollectorInternalHeaders(),
        timeout: 10000,
      },
    );

    const data =
      response.data && 'data' in response.data && response.data.data
        ? response.data.data
        : (response.data as { batches?: CollectorInternalBatchMetadata[] });

    return {
      batches: Array.isArray(data.batches) ? data.batches : [],
    };
  }

  private getCollectorBaseUrl(): string {
    const collectorBaseUrl = process.env.ANALYSIS_COLLECTOR_URL;

    if (!collectorBaseUrl) {
      throw ErrorExceptionFactory.createFromStatus(
        'http',
        ErrorStatus.SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return collectorBaseUrl.replace(/\/+$/, '');
  }

  private getCollectorInternalHeaders() {
    const token = process.env.INTERNAL_ANALYSIS_TOKEN;

    return token
      ? {
          'x-internal-analysis-token': token,
        }
      : {};
  }

  private unwrapCollectorResponse<T>(payload: T | { data?: T }): T {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
      return payload.data;
    }

    return payload as T;
  }
}

type CollectorInternalBatchMetadata = {
  batch_id: number | string;
  customer_id: number | string | null;
  consultant_id: number | string | null;
  app_id: number | string | null;
  analysis_type: string | null;
  sync_status?: string | null;
  synced_at?: string | Date | null;
  created_at?: string | Date | null;
};

function toNumberOrNull(v: any): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
