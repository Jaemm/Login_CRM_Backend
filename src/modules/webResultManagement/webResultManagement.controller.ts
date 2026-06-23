import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WebResultService } from './webResultManagement.service';
import { WebResultExpirationDto } from './webResultManagement.dto';

@ApiTags('web-results')
@Controller('web-results')
export class WebResultController {
  constructor(private readonly webResult: WebResultService) {}

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('expiration-check')
  async create(@Body() body: WebResultExpirationDto) {
    const response = await this.webResult.expiredResult(body.batch_id, body.customer_id);
    return { message: response };
  }
}
