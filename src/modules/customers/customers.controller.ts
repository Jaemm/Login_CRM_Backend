import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  Res,
  forwardRef,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomersService } from './customers.service';
import { ApiBearerAuth, ApiHeader, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  AllLicenseDto,
  CalculatePriceDto,
  ChangePasswordCustomerDto,
  CustomerChangeLicenseDto,
  CustomerSignUpDto,
  CustomersDto,
  DeleteCustomerDto,
  CreatePrivacyRequestDto,
  NotifySalesChangeLicenseDto,
  PasswordDto,
  PresignedUploadDto,
  ResendConfirmationDto,
  RenewDevicesDto,
  UpdateCustomersDto,
  UpdateLicenseDto,
  TokenRefreshDto,
} from './customers.dto';
import { ConfirmHtmlDto } from '../consultants/consultants.dto';
import { Public } from '@/src/common/decorators/public-route.decorator';
import { Roles } from '@/src/common/decorators/roles.decorator';
import { Role } from '@/src/common/enums/role.enum';

@ApiTags('Customers')
@ApiHeader({
  name: 'X-CHOWIS-TOKEN',
  description: 'Custom header x-chowis',
  required: true,
})
@Controller('customers')
export class CustomersController {
  constructor(
    @Inject(forwardRef(() => CustomersService)) private readonly customers: CustomersService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: CustomersDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ) {
    const result = await this.customers.login(
      body.email,
      body.password,
      Number(body.app_id),
      locale,
      company,
    );
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post()
  @ApiHeader({ name: 'X-CONSULTANT-COMPANY', required: false })
  async signUp(
    @Body() body: CustomerSignUpDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ) {
    const result = await this.customers.customreSignUp(body, locale, company);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
  @ApiHeader({ name: 'X-CONSULTANT-COMPANY', required: false })
  async register(
    @Body() body: CustomersDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ) {
    const result = await this.customers.signUp(body, locale, company);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Put('update')
  async update(@Req() req: Request, @Body() body: UpdateCustomersDto) {
    const userId = Number((req['user'] as any).id);
    const result = await this.customers.update(userId, body);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get('me')
  async me(@Req() req: Request) {
    const id = (req['user'] as any).id;
    const result = await this.customers.customerDetails(id);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get('export')
  async export(@Req() req: Request) {
    const id = (req['user'] as any).id;
    const result = await this.customers.exportCustomerData(id);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get('export-file')
  async exportFile(@Req() req: Request, @Res() res: Response) {
    const id = (req['user'] as any).id;
    const result = await this.customers.exportCustomerData(id);
    const filename = `customer-data-${id}-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(HttpStatus.OK).send(JSON.stringify(result, null, 2));
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @HttpCode(HttpStatus.OK)
  @Post('privacy-requests')
  async createPrivacyRequest(@Req() req: Request, @Body() body: CreatePrivacyRequestDto) {
    const id = (req['user'] as any).id;
    return this.customers.createPrivacyRequest(String(id), body);
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get('privacy-requests')
  async getPrivacyRequests(@Req() req: Request) {
    const id = (req['user'] as any).id;
    return this.customers.getPrivacyRequests(String(id));
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @HttpCode(HttpStatus.OK)
  @Post('password_change')
  async passwordChange(
    @Req() req: Request,
    @Body() body: ChangePasswordCustomerDto,
    @Headers('x-locale') locale: string,
    @Headers('x-locale') localeConsultant: string,
  ) {
    const id = (req['user'] as any).id;
    const language = locale || localeConsultant || 'en';
    const result = await this.customers.passwordChange(id, body, language);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('generate_token')
  async generateToken() {
    const result = await this.customers.generateToken();
    return result;
  }

  @Public()
  @Get('presign_upload')
  async presignUpload(@Body() body: PresignedUploadDto) {
    const result = await this.customers.presignUpload(body);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request) {
    const id = (req['user'] as any).id;
    const result = await this.customers.logout(id);
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('resend-confirmation-customer')
  @ApiHeader({ name: 'X-CONSULTANT-COMPANY', required: false })
  async resendConfirmation(
    @Body() body: ResendConfirmationDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ) {
    const result = await this.customers.resendConfirmation(body, locale, company);
    return result;
  }

  @Public()
  @ApiQuery({ name: 'token' })
  @Get('confirmation')
  async confirmation(@Res() res: Response, @Query() token: ConfirmHtmlDto) {
    const result = await this.customers.confirmEmail(token);
    return res.status(200).send(result);
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get(':id')
  async getCustomer(@Query('id') id: string) {
    const result = await this.customers.getCustomerById(id);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('password')
  async password(
    @Body() body: PasswordDto,
    @Headers('x-locale') locale: string,
    @Headers('x-locale') localeConsultant: string,
  ) {
    const language = locale || localeConsultant || 'en';
    const result = await this.customers.password(body, language);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Delete('delete_account')
  async deleteAccount(@Req() req: Request, @Body() body: DeleteCustomerDto) {
    const id = (req['user'] as any).id;
    const result = await this.customers.deleteAccount(id, body);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get('all-licenses')
  async allLicenses(@Req() req: Request, @Query() query: AllLicenseDto) {
    const id = Number((req['user'] as any).id);
    const result = await this.customers.getAllLicense(id, query);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Put('change-license')
  async changeLicense(@Req() req: Request, @Body() body: CustomerChangeLicenseDto) {
    const id = Number((req['user'] as any).id);
    const result = await this.customers.changeLicense(id, body);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Put('notify_sales_change_license')
  async notifySalesChangeLicense(@Req() req: Request, @Body() body: NotifySalesChangeLicenseDto) {
    const id = Number((req['user'] as any).id);
    const result = await this.customers.notifySalesChangeLicense(id, body);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get('calculate-price')
  async calculatePrice(@Req() req: Request, @Query() query: CalculatePriceDto) {
    const id = Number((req['user'] as any).id);
    const result = await this.customers.calculatePrice(id, query);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Put('update-license')
  async updateLicense(@Req() req: Request, @Body() body: UpdateLicenseDto) {
    const id = Number((req['user'] as any).id);
    const result = await this.customers.updateLicense(id, body);
    return result;
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @HttpCode(HttpStatus.OK)
  @Post('renew-devices')
  async renewLicense(@Req() req: Request, @Body() body: RenewDevicesDto) {
    const id = Number((req['user'] as any).id);
    const result = await this.customers.renewDevices(id, body);
    return result;
  }

  @Public()
  @Post('tokens/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: Request, @Body() body: TokenRefreshDto): Promise<any> {
    const customers = await this.customers.refreshToken(body);
    return customers;
  }
}
