import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';

import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CRMService } from './crm.service';
import { Request } from 'express';
import {
  CustomerSyncDto,
  GetCustomerLogDto,
  GetByEmailDto,
  GetCustomerDto,
  GetPrivacyRequestsDto,
  HandlePrivacyRequestDto,
  PresignedUploadDto,
  UpdateConsentForm,
  UpdateCrmCustomersDto,
} from './crm.dto';
import { JwtService } from '@/src/jwt/jwt.service';
import { Roles } from '@/src/common/decorators/roles.decorator';
import { Role } from '@/src/common/enums/role.enum';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { ResendConfirmationDto } from '../customers/customers.dto';

@ApiTags('CRM')
@Controller('crm')
export class CRMController {
  constructor(private readonly crmService: CRMService, private readonly jwtService: JwtService) {}

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('customers/register')
  async registerConsultantCustomer(@Req() req: Request, @Body() body: UpdateCrmCustomersDto) {
    const userId = Number((<{ id: string }>req['user']).id);
    return this.crmService.register(userId, body);
  }

  @ApiHeader({ name: 'x-locale', required: false, schema: { default: 'en' } })
  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('customers/update/:id')
  async updateConsultantCustomer(
    @Req() req: Request,
    @Param('id') customerId: string,
    @Body() body: UpdateCrmCustomersDto,
  ) {
    const consultantId = Number((<{ id: string }>req['user']).id);
    return this.crmService.update(consultantId, Number(customerId), body);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('customers')
  async getCustomers(@Req() req: Request, @Query() query: GetCustomerDto) {
    const userId = Number((<{ id: string }>req['user']).id);
    return this.crmService.getCustomer(userId, query);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('customers')
  async createCustomer(@Req() req: Request, @Body() body: UpdateCrmCustomersDto) {
    const userId = Number((<{ id: string }>req['user']).id);
    return this.crmService.createCustomer(userId, body);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('customers/get_by_email')
  async getCustomerByEmail(@Req() req: Request, @Query() query: GetByEmailDto) {
    const userId = Number((<{ id: string }>req['user']).id);
    return this.crmService.getByEmail(userId, query);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('customer-logs')
  async getCustomerLogs(@Req() req: Request, @Query() query: GetCustomerLogDto) {
    const consultantId = Number((<{ id: string }>req['user']).id);
    return this.crmService.getCustomerLogs(consultantId, query);
  }

  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Consultant)
  @Get('privacy-requests')
  async getPrivacyRequests(@Req() req: Request, @Query() query: GetPrivacyRequestsDto) {
    const user = req['user'] as { id?: string; role?: string } | undefined;
    const consultantId = Number(user?.id);
    const role = String(user?.role ?? Role.Consultant);
    return this.crmService.getPrivacyRequests(query, consultantId, role);
  }

  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Consultant)
  @Put('privacy-requests/:id')
  async handlePrivacyRequest(
    @Req() req: Request,
    @Param('id') requestId: string,
    @Body() body: HandlePrivacyRequestDto,
  ) {
    const consultantId = Number((<{ id: string }>req['user']).id);
    const role = String((req['user'] as any).role ?? '');
    return this.crmService.handlePrivacyRequest(consultantId, requestId, body, role);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('customers/:id')
  async getCustomerById(@Req() req: Request, @Param('id') customerId: string) {
    const consultantId = Number((<{ id: string }>req['user']).id);
    return this.crmService.getCustomerById(consultantId, Number(customerId));
  }

  @ApiBearerAuth()
  @Put('customers/:id')
  async updateCustomer(@Body() body: UpdateCrmCustomersDto, @Param('id') customerId: string) {
    return this.crmService.updateCustomer(Number(customerId), body);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Delete('customers/:id')
  async deleteCustomer(@Req() req: Request, @Param('id') customerId: string) {
    const consultantId = Number((<{ id: string }>req['user']).id);
    return this.crmService.deleteCustomer(consultantId, Number(customerId));
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('customers/sync')
  async syncCustomers(@Req() req: Request, @Body() body: CustomerSyncDto) {
    const token = this.jwtService.getTokenFromRequest(req);
    if (!token) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }
    const consultantId = Number((<{ id: string }>req['user']).id);
    return this.crmService.syncCustomer(consultantId, token, body);
  }

  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('customers/presign_upload_consent_form')
  async presignUploadConsentForm(@Body() body: PresignedUploadDto) {
    return this.crmService.presignedUpload(body);
  }

  @Roles(Role.Consultant)
  @Put('customers/update_consent_form')
  async updateConsentForm(@Body() body: UpdateConsentForm) {
    return this.crmService.updateConsentForm(body);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('resend-confirmation')
  @ApiHeader({ name: 'x-locale', required: false, schema: { default: 'en' } })
  @ApiHeader({ name: 'X-CONSULTANT-COMPANY', required: false })
  async resendConfirmation(
    @Body() body: ResendConfirmationDto,
    @Req() req: Request,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ) {
    const consultantId = Number((<{ id: string }>req['user']).id);
    return this.crmService.resendConfirmation(
      body,
      consultantId,
      locale,
      company,
    );
  }
}
