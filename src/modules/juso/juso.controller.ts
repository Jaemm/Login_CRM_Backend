import {
  Controller,
  Get,
  Query,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JusoService } from './juso.service';
import { JusoDto } from './juso.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

const logger = new Logger('JusoController');

@ApiTags('Juso')
@Controller('juso')
@UsePipes(
  new ValidationPipe({
    transform: true,
    exceptionFactory: (errors) => {
      const messages = errors.flatMap((err) => Object.values(err.constraints || {}));
      logger.warn(
        JSON.stringify({
          message: 'Juso request validation failed',
          errors: messages,
        }),
      );
      return ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    },
  }),
)
export class JusoController {
  constructor(private readonly jusoService: JusoService) {}

  @Get()
  @ApiOperation({
    summary: 'Search addresses (domestic or international)',
    description: `Search Korean addresses using Juso API when the keyword is in Korean.
Search international addresses using Geoapify API when the keyword is in English.`,
  })
  @ApiQuery({
    name: 'keyword',
    required: true,
    description: `Search keyword.\n
Korean → Domestic address search (Juso API)\n
English → International address search (Geoapify Autocomplete API)`,
  })
  @ApiResponse({ status: 200, description: 'Successfully returned list of addresses' })
  @ApiResponse({ status: 400, description: 'Bad request - missing or invalid keyword' })
  @ApiResponse({ status: 500, description: 'JUSO API request failed' })
  async getJuso(@Query() query: JusoDto) {
    const results = await this.jusoService.fetchJuso(query.keyword);
    return { results };
  }
}
