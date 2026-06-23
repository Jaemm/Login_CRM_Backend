import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { LicenceService } from './licence.service';

@ApiTags('licence')
@Controller('licence')
export class LicenceController {
  constructor(private readonly licenceService: LicenceService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single license' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(@Param('id') id: number) {
    return await this.licenceService.findOneLicence(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get a list of licenses (with optional filters)' })
  async findMany(@Query() query: any) {
    return await this.licenceService.findLicence(query);
  }

  @Get('application')
  @ApiOperation({ summary: 'Get a single application license' })
  async findApplicationLicence(@Query() query: any) {
    return await this.licenceService.findApplicationLicence(query);
  }

  @Get('histories')
  @ApiOperation({ summary: 'Get all license history records' })
  async findHistories(@Query() query: any) {
    return await this.licenceService.findLicenceHistories(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get a single license history record' })
  async findHistory(@Query() query: any) {
    return await this.licenceService.findLicenceHistory(query);
  }
}
