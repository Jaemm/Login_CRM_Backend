import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import {
  ApplicationsVersionCheckDto,
  ApplicationsVersionCheckResponseDto,
  ApplicationsVersionCheckV2ResponseDto,
} from './applications.dto';
import { createSuccessResponse } from '@/src/common/response/api-response';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get('app_version_check')
  @ApiOperation({
    summary: 'Check application version',
    description: 'Validates the requested app version against the stored application versions.',
  })
  @ApiQuery({ name: 'app_id', required: true, description: 'Application ID' })
  @ApiQuery({ name: 'operating_system', required: true, enum: ['ios', 'aos'] })
  @ApiOkResponse({ type: ApplicationsVersionCheckResponseDto })
  @ApiBadRequestResponse({ description: 'Version check failed' })
  async appVersionCheck(@Query() params: ApplicationsVersionCheckDto) {
    return await this.applications.applicationVersionCheck(params);
  }

  @Get('app_version_check/v2')
  @ApiOperation({
    summary: 'Check application version v2',
    description:
      'Returns the same version data as v1 plus the application URL and cancel flag from the applications table.',
  })
  @ApiQuery({ name: 'app_id', required: true, description: 'Application ID' })
  @ApiQuery({ name: 'operating_system', required: true, enum: ['ios', 'aos'] })
  @ApiOkResponse({ type: ApplicationsVersionCheckV2ResponseDto })
  @ApiBadRequestResponse({ description: 'Version check failed' })
  async appVersionCheckV2(@Query() params: ApplicationsVersionCheckDto) {
    const result = await this.applications.applicationVersionCheckV2(params);
    return createSuccessResponse(0, 'Success!', result);
  }
}
