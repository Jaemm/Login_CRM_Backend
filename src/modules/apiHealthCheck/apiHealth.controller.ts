import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('/health')
  healthCheck() {
    return {
      statusCode: HttpStatus.OK,
      message: 'Server is up and running',
    };
  }
}
