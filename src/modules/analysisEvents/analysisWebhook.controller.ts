import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { AnalysisWebhookService } from './analysisWebhook.service';
import { BatchSyncPayload } from './measurement/measurement.types';
import { AnalysisWebhookResponse } from './analysisWebhook.types';
import { ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Analysis Webhooks')
@Controller('internal/webhook')
export class AnalysisWebhookController {
  private readonly logger = new Logger(AnalysisWebhookController.name);

  constructor(private readonly service: AnalysisWebhookService) {}

  @Post('analysis-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive and validate an analysis completion webhook',
    description:
      'Receives an external analysis completion payload. Use process mode for normal handling or validate mode to verify a payload without side effects.',
  })
  @ApiHeader({
    name: 'x-analysis-source',
    required: true,
    description: 'Analysis source identifier. CNDP is allowed by default.',
    schema: { example: 'CNDP' },
  })
  @ApiHeader({
    name: 'x-webhook-mode',
    required: false,
    description: 'Optional alternative to the mode query parameter.',
    schema: { enum: ['process', 'validate'], default: 'process' },
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    description: 'Use validate to check the payload without side effects.',
    enum: ['process', 'validate'],
  })
  @ApiBody({
    schema: {
      example: {
        batch_id: 1234,
        analysis_db: 'analysis_cndp_hair',
        customer: {
          customer_id: 5678,
          name: 'Jane',
          surname: 'Doe',
          phone: '+821012345678',
          birth: '1990-01-01',
          country_id: 82,
          email: 'jane@example.com',
        },
        measurements: [
          {
            type_measurement_id: 10,
            type_measurement_name: 'Hair',
            measurements: [
              {
                nth_analysis: '1',
                raw: 0.12,
                score: 0.91,
                computation_score: 0.89,
                keyword: 'healthy',
                originalImage: 'https://example.com/original.jpg',
                analysisImage: 'https://example.com/analysis.jpg',
              },
            ],
          },
        ],
      },
    },
  })
  async receiveAnalysisComplete(
    @Body() payload: BatchSyncPayload,
    @Headers('x-analysis-source') source: string,
    @Query('mode') mode?: string,
    @Headers('x-webhook-mode') headerMode?: string,
  ) {
    this.logger.log('[WEBHOOK][RECEIVED]', {
      batch_id: payload?.batch_id,
      source,
      mode: mode ?? headerMode ?? 'process',
    });

    const response: AnalysisWebhookResponse = await this.service.handle(payload, {
      source,
      mode: mode ?? headerMode,
    });

    return response;
  }
}
