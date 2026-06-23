import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ChowisServiceService } from './chowis-service.service';
import { ExpirationCheckDto } from './chowis-service.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Chowis Service')
@Controller('chowis-service')
export class ChowisServiceController {
  constructor(private readonly chowisServiceService: ChowisServiceService) {}

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('expirationCheck')
  async checkLicenseExpiration(@Body() data: ExpirationCheckDto) {
    return this.chowisServiceService.checkLicenseExpiration(data);
  }

  @Get('check-consultant-expiry')
  checkLicense() {
    return this.chowisServiceService.handleDailyLicenseCheck();
  }

  @Get('check-product-expiry')
  handleProductLicenseCheck() {
    return this.chowisServiceService.handleProductLicenseCheck();
  }

  @Get('refresh-product-usage-metrics')
  refreshProductUsageMetrics() {
    return this.chowisServiceService.recordProductUsageMetrics();
  }
}
