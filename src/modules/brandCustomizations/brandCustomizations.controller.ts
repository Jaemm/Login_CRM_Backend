import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BrandCustomizationsService } from './brandCustomizations.service';
import { BrandCustomizationResponseDto } from './brandCustomizations.dto';

@ApiTags('Brand Customizations')
@Controller('brand-customizations')
export class BrandCustomizationsController {
  constructor(private readonly service: BrandCustomizationsService) {}

  @Get(':brandId')
  @ApiOperation({ summary: 'Get brand customization settings' })
  @ApiQuery({ name: 'application_id', required: false })
  async getBrandCustomization(
    @Param('brandId', ParseIntPipe) brandId: number,
    @Query('application_id') applicationId?: string,
  ): Promise<BrandCustomizationResponseDto> {
    return this.service.getBrandCustomization(brandId, applicationId);
  }
}
