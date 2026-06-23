import {
  Controller,
  Get,
  Param,
  Headers,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';

import { AnalysisQueryService } from './analysis-query.service';
import { AnalysisServerType } from '../../common/enums/analysis-server-type.enum';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Analysis Webhooks')
@Controller('internal/:server_type/analysis')
export class AnalysisQueryController {
  constructor(private readonly service: AnalysisQueryService) {}

  /* =========================
   * batch list 조회
   * ========================= */
  @Get()
  @ApiOperation({
    summary: 'List completed analysis batches available to a company',
    description:
      'Pull-style integration endpoint. Returns recent completed batches owned by the company identified by X-ANALYSIS-TOKEN.',
  })
  @ApiHeader({
    name: 'X-ANALYSIS-TOKEN',
    required: true,
    description: 'Active analysis token assigned to the consultant company.',
  })
  @ApiParam({
    name: 'server_type',
    enum: AnalysisServerType,
    description: 'Analysis server whose completed batches should be queried.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of batches to return. Values are clamped to 1-100.',
    schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
  })
  async getBatchList(
    @Param('server_type') serverTypeParam: string,
    @Headers('X-ANALYSIS-TOKEN') analysisToken: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const serverType = this.validateServerType(serverTypeParam);

    if (!analysisToken) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);

    return this.service.getBatchList(serverType, analysisToken, safeLimit);
  }

  /* =========================
   * 단일 batch 조회
   * ========================= */
  @Get(':batch_id')
  @ApiOperation({
    summary: 'Get a completed analysis batch',
    description:
      'Pull-style integration endpoint. Returns one completed batch owned by the company identified by X-ANALYSIS-TOKEN. Results are available for seven days after completion.',
  })
  @ApiHeader({
    name: 'X-ANALYSIS-TOKEN',
    required: true,
    description: 'Active analysis token assigned to the consultant company.',
  })
  @ApiParam({
    name: 'server_type',
    enum: AnalysisServerType,
    description: 'Analysis server that contains the requested batch.',
  })
  @ApiParam({
    name: 'batch_id',
    type: Number,
    description: 'Completed analysis batch ID.',
  })
  async getAnalysis(
    @Param('server_type') serverTypeParam: string,
    @Param('batch_id', ParseIntPipe) batchId: number,
    @Headers('X-ANALYSIS-TOKEN') analysisToken: string,
  ) {
    const serverType = this.validateServerType(serverTypeParam);

    if (!analysisToken) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    return this.service.getBatchAnalysis(serverType, batchId, analysisToken);
  }

  /* =========================
   * enum 검증 helper
   * ========================= */
  private validateServerType(value: string): AnalysisServerType {
    if (!Object.values(AnalysisServerType).includes(value as AnalysisServerType)) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }

    return value as AnalysisServerType;
  }
}
