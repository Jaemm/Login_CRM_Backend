import { Body, Controller, HttpCode, HttpStatus, Post, Headers } from '@nestjs/common';
import { AnalysisCompleteService } from './analysisComplete.service';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { AnalysisDatabaseKey } from '../../common/enums/analysis-server-type.enum';
import { CollectorAnalysisCompleteRequest } from './measurement/measurement.types';
import { ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Analysis Webhooks')
@Controller('internal')
export class AnalysisCompleteController {
  constructor(private readonly service: AnalysisCompleteService) {}

  private normalizeAnalysisDbKey(value?: string): AnalysisDatabaseKey | undefined {
    if (!value) return undefined;

    const normalized = value.toLowerCase();
    const aliases: Record<string, AnalysisDatabaseKey> = {
      [AnalysisDatabaseKey.ANALYSIS_CNDP_HAIR]: AnalysisDatabaseKey.ANALYSIS_CNDP_HAIR,
      [AnalysisDatabaseKey.ANALYSIS_CNDP_SKIN]: AnalysisDatabaseKey.ANALYSIS_CNDP_SKIN,
      [AnalysisDatabaseKey.ANALYSIS_CMA_HAIR]: AnalysisDatabaseKey.ANALYSIS_CMA_HAIR,
      [AnalysisDatabaseKey.ANALYSIS_CMA_SKIN]: AnalysisDatabaseKey.ANALYSIS_CMA_SKIN,
      cndphair: AnalysisDatabaseKey.ANALYSIS_CNDP_HAIR,
      cndpskin: AnalysisDatabaseKey.ANALYSIS_CNDP_SKIN,
      cmahair: AnalysisDatabaseKey.ANALYSIS_CMA_HAIR,
      cmaskin: AnalysisDatabaseKey.ANALYSIS_CMA_SKIN,
      hair: AnalysisDatabaseKey.ANALYSIS_CNDP_HAIR,
      skin: AnalysisDatabaseKey.ANALYSIS_CNDP_SKIN,
    };

    return aliases[normalized];
  }

  @Post('analysis-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send completed analysis results to the configured company webhook',
    description:
      'Internal callback for CNDP and CMA analysis servers. Loads the completed analysis and customer data, then delivers the normalized result to the consultant company webhook URL.',
  })
  @ApiHeader({
    name: 'x-internal-analysis-token',
    required: true,
    description: 'Shared token for internal analysis server callbacks.',
  })
  @ApiBody({
    schema: {
      example: {
        batch_id: 1234,
        analysis_db: 'analysis_cndp_hair',
        consultant_id: 5678,
      },
    },
  })
  async analysisComplete(
    @Headers('x-internal-analysis-token') internalAnalysisToken: string,
    @Body()
    body: {
      batch_id?: number;
      analysis_db?: AnalysisDatabaseKey | string;
      consultant_id?: number;
      consultant_company_id?: number;
    },
  ) {
    const expectedToken = process.env.INTERNAL_ANALYSIS_TOKEN;

    if (expectedToken && internalAnalysisToken !== expectedToken) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }

    const { batch_id } = body;
    const consultantId = body.consultant_id ?? body.consultant_company_id;
    const analysis_db = this.normalizeAnalysisDbKey(body.analysis_db);

    if (!batch_id || !analysis_db) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    await this.service.handleAnalysisComplete(
      batch_id,
      analysis_db as AnalysisDatabaseKey,
      consultantId,
    );

    return { status: 200 };
  }

  @Post('analysis-collector-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send completed collector analysis results to the configured company webhook',
    description:
      'Internal callback for the analysis collector. Fetches collector web results by batch ID, adds collector images and result data, then delivers the payload to the consultant company webhook URL.',
  })
  @ApiHeader({
    name: 'x-internal-analysis-token',
    required: true,
    description: 'Shared token for internal analysis collector callbacks.',
  })
  @ApiBody({
    schema: {
      example: {
        batch_id: 1234,
        customer_id: 5678,
        consultant_id: 9012,
        app_id: 1,
        analysis_type: 'skin',
      },
    },
  })
  async analysisCollectorComplete(
    @Headers('x-internal-analysis-token') internalAnalysisToken: string,
    @Body() body: CollectorAnalysisCompleteRequest,
  ) {
    const expectedToken = process.env.INTERNAL_ANALYSIS_TOKEN;

    if (expectedToken && internalAnalysisToken !== expectedToken) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }

    const batchId = this.toOptionalNumber(body?.batch_id);
    const customerId = this.toOptionalNumber(body?.customer_id);
    const consultantId = this.toOptionalNumber(body?.consultant_id);

    if (!batchId || (!customerId && !consultantId)) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    await this.service.handleCollectorAnalysisComplete({
      ...body,
      batch_id: batchId,
      customer_id: customerId,
      consultant_id: consultantId,
    });

    return { status: 200 };
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
