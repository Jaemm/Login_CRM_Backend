import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConsultantsService } from './consultants.service';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import {
  ResendConfirmationDto,
  AllLicenseDto,
  CalculatePriceDto,
  ChangeEmailDto,
  ChangeLicenseDto,
  ConfirmHtmlDto,
  ConsultantCompanyDetailsDto,
  ConsultantDto,
  GetConsultantDto,
  NotifySalesChangeLicenseDto,
  PasswordDto,
  RenewDevicesDto,
  RequestCallBackUrlDto,
  UpdateConsultantDto,
  UpdateLicenseDto,
  LoginPhoneDto,
  ProductRecommendationsDto,
  TokenRefreshDto,
  PasswrodChangeDto,
  EnterProductDto,
  GetNotificationsDto,
  UpdatePasswordDto,
  GetConsultantLogDto,
} from '@/src/modules/consultants/consultants.dto';
import { JwtService } from '@/src/jwt/jwt.service';
import { Roles } from '@/src/common/decorators/roles.decorator';
import { Role } from '@/src/common/enums/role.enum';
import { Public } from '@/src/common/decorators/public-route.decorator';
import { CRMService } from '../crm/crm.service';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { createSuccessResponse } from '@/src/common/response/api-response';

@ApiTags('Consultants')
@Controller('consultants')
export class ConsultantsController {
  constructor(
    private readonly consultants: ConsultantsService,
    private jwtService: JwtService,
    private readonly crmService: CRMService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async login(@Body() body: ConsultantDto, @Headers('x-locale') locale: string): Promise<any> {
    const loginResult = await this.consultants.login(body, locale);
    return loginResult;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get()
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async getConsultants(@Query() query: GetConsultantDto): Promise<any> {
    const consultants = await this.consultants.getConsultants(query);
    return consultants;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post()
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'X-CONSULTANT-COMPANY',
    description: 'Company for the request',
    required: false,
  })
  async createConsultant(
    @Body() body: ConsultantDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ): Promise<any> {
    const consultant = await this.consultants.signUp(body, locale, company);
    return consultant;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'X-CONSULTANT-COMPANY',
    description: 'Company for the request',
    required: false,
  })
  async registerConsultant(
    @Body() body: ConsultantDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ): Promise<any> {
    const consultant = await this.consultants.signUp(body, locale, company);
    return consultant;
  }

  @Public()
  @Get('confirmation')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async confirmation(@Query() param: { token: string }): Promise<any> {
    const { token } = param;
    const confirmationResult = await this.consultants.confirmation(token);
    return confirmationResult;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'X-CONSULTANT-COMPANY',
    description: 'Company for the request',
    required: false,
  })
  @Put('update')
  async updateConsultant(
    @Req() req: Request,
    @Body() body: UpdateConsultantDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);

    const consultant = await this.consultants.modifyConsultant(userId, body, locale, company);
    return consultant;
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('resend-confirmation')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'X-CONSULTANT-COMPANY',
    description: 'Company for the request',
    required: false,
  })
  async resendConfirmation(
    @Req() req: Request,
    @Body() body: ResendConfirmationDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ): Promise<any> {
    const consultant = await this.consultants.resendConfirmation(body, locale, company);
    return consultant;
  }

  @ApiBearerAuth()
  @Get('change_email')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'X-CONSULTANT-COMPANY',
    description: 'Company for the request',
    required: false,
  })
  async changeEmail(
    @Req() req: Request,
    @Query() query: ChangeEmailDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const consultant = await this.consultants.changeEmail(userId, query, locale, company);
    return consultant;
  }

  @Public()
  @Get('confirm')
  async confirmEmail(
    @Res() res: Response,
    @Query() query: ConfirmHtmlDto,
    @Query('locale') locale: string,
  ) {
    const template = await this.consultants.confirmEmail(query, locale);
    return res.status(200).send(template);
  }

  @Public()
  @Get(':id/confirm_email.html')
  async confirmEmailById(@Res() res: Response, @Param('id') id: string): Promise<any> {
    const template = await this.consultants.confirmEmailById(id);
    return res.status(200).send(template);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('me')
  async getMe(@Req() req: Request): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);

    const consultant = await this.consultants.getMe(userId);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('crmsync')
  async crmsync(@Req() req: Request): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);

    const consultant = await this.consultants.crmsync(userId);
    return consultant;
  }

  @HttpCode(HttpStatus.OK)
  @Post('password')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async password(
    @Req() req: Request,
    @Body() body: PasswordDto,
    @Headers('x-locale') locale: string,
    @Headers('x-locale') localeConsultant: string,
  ): Promise<any> {
    const language = locale || localeConsultant || 'en';
    const consultant = await this.consultants.password(body, language);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('password_change')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async passwordChange(
    @Req() req: Request,
    @Body() body: PasswrodChangeDto,
    @Headers('x-locale') locale: string,
    @Headers('x-locale') localeConsultant: string,
  ): Promise<any> {
    const language = locale || localeConsultant || 'en';
    const userId = Number((<{ id: string }>req['user']).id);
    const consultant = await this.consultants.passwordChange(userId, body, language);
    return consultant;
  }

  @Public()
  @Get('password-change')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async passwordChangeNew(
    @Req() req: Request,
    @Query('token') token: string,
    @Headers('x-locale') locale: string,
    @Headers('x-locale') localeConsultant: string,
  ): Promise<any> {
    const language = locale || localeConsultant || 'en';

    const consultant = await this.consultants.passwordChangeNew(token, language);
    return consultant;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('password-recovery')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async passwordRecovery(
    @Req() req: Request,
    @Body() body: PasswordDto,
    @Headers('x-locale') locale: string,
    @Headers('x-locale') localeConsultant: string,
  ): Promise<any> {
    const language = locale || localeConsultant || 'en';
    const consultant = await this.consultants.passwordRecovery(body, language);
    return consultant;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('update-password')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async updatePassword(
    @Req() req: Request,
    @Body() data: UpdatePasswordDto,
    @Headers('x-locale') locale: string,
  ): Promise<any> {
    const language = locale || 'en';
    const consultant = await this.consultants.updatePassword(data, language);
    return consultant;
  }

  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    if (!userId) {
      return { message: 'success' };
    }

    await this.consultants.logout(userId);
    return { message: 'success' };
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('request_callback_url')
  async requestCallbackUrl(@Req() req: Request, @Body() body: RequestCallBackUrlDto): Promise<any> {
    const token = this.jwtService.getTokenFromRequest(req);
    const consultantId = Number((<{ id: string }>req['user']).id);

    if (!token) {
      throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
    }
    const consultant = await this.consultants.requestCallbackUrl(body, token, consultantId);
    return consultant;
  }

  @Get('company')
  async getCompany(): Promise<any> {
    const company = await this.consultants.getCompany();
    return company;
  }

  @Get('consult-company-details')
  async getCompanyDetails(
    @Req() req: Request,
    @Query() query: ConsultantCompanyDetailsDto,
  ): Promise<any> {
    const company = await this.consultants.getCompanyDetails(query);
    return company;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Delete('delete_account')
  async deleteAccount(@Req() req: Request): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const appId = (<{ app_id: string }>req['user'])?.app_id ?? null;

    const consultant = await this.consultants.deleteAccount(userId, appId);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('logs')
  async getLogs(@Req() req: Request, @Query() query: GetConsultantLogDto): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    return this.consultants.getConsultantLogs(userId, query);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('all-license')
  async getAllLicense(@Req() req: Request, @Query() query: AllLicenseDto): Promise<any> {
    const consultant = await this.consultants.getAllLicense(query);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Put('change-license')
  async changeLicense(@Req() req: Request, @Body() body: ChangeLicenseDto): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const consultant = await this.consultants.changeLicense(userId, body);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Put('notify_sales_change_license')
  async notifySalesChangeLicense(
    @Req() req: Request,
    @Body() body: NotifySalesChangeLicenseDto,
  ): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const consultant = await this.consultants.notifySalesChangeLicense(userId, body);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('calculate-price')
  async calculatePrice(@Req() req: Request, @Query() query: CalculatePriceDto): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const response = await this.consultants.calculatePrice(userId, query);
    return response;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Put('update-license')
  async updateLicense(@Body() body: UpdateLicenseDto): Promise<any> {
    const consultant = await this.consultants.updateLicense(body);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('renew-devices')
  async renewDevices(@Req() req: Request, @Body() body: RenewDevicesDto): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const consultant = await this.consultants.renewDevices(userId, body);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('login/phone')
  async loginPhone(@Req() req: Request, @Body() body: LoginPhoneDto): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const consultant = await this.consultants.loginPhone(body, userId);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @Get('product_recommendations')
  async getProductRecommendations(
    @Req() req: Request,
    @Query() query: ProductRecommendationsDto,
  ): Promise<any> {
    const consultant = await this.consultants.getProductRecommendations(query);
    return consultant;
  }

  @Public()
  @Post('tokens/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Req() req: Request, @Body() body: TokenRefreshDto): Promise<any> {
    const consultant = await this.consultants.refreshToken(body);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('products/enter')
  @ApiHeader({
    name: 'x-locale',
    description: 'Locale for the request',
    required: false,
    schema: {
      default: 'en',
    },
  })
  async enterProducts(
    @Req() req: Request,
    @Body() body: EnterProductDto,
    @Headers('x-locale') locale: string,
  ): Promise<any> {
    const userId = Number((<{ id: string }>req['user']).id);
    const userTokenInfo = <{ is_hair_skin: boolean | null | undefined }>req['user'];

    if (!body.optic_number || !body.password || !body.application_id) {
      throw ErrorExceptionFactory.createFromStatus(
        'badRequest',
        ErrorStatus.PRODUCT_CREDS_REQUIRED,
      );
    }
    const consultant = await this.consultants.enterProducts(userId, body, userTokenInfo, locale);
    return consultant;
  }

  @ApiBearerAuth()
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  @Post('brevo/resync-newsletters')
  async resyncBrevoNewsletters(): Promise<any> {
    const result = await this.consultants.resyncBrevoConsultants();
    return createSuccessResponse(0, 'Brevo consultant resync completed', result);
  }

  @ApiBearerAuth()
  @Get('notifications')
  async notifications(@Req() req: Request, @Query() query: GetNotificationsDto): Promise<any> {
    const consultantId = Number((<{ id: string }>req['user']).id);
    const notifications = await this.consultants.getNotifications(consultantId, query);
    return notifications;
  }

  @ApiBearerAuth()
  @Delete('notifications/:id')
  async deleteNotificaion(@Req() req: Request, @Param('id') id: string): Promise<any> {
    const response = await this.consultants.deleteNotification(Number(id));
    return response;
  }

  @ApiTags('CRM')
  @ApiBearerAuth()
  @Get('customers/:id')
  async getCustomerById(@Req() req: Request, @Param('id') customerId: string): Promise<any> {
    const consultantId = Number((<{ id: string }>req['user']).id);
    const customer = await this.crmService.getCustomerById(consultantId, Number(customerId));
    return customer;
  }

  @Public()
  @Get('passord-changed')
  getRedirect(@Res() res: Response) {
    return res.status(200).send(`<style>
                .flex { display: flex; } .justify-center { justify-content: center; } .flex-column-reverse { flex-direction:
                column-reverse; } .flex-column { flex-direction: column; } .center { position: fixed; top: 50%; left: 50%; /* bring
                your own prefixes */ transform: translate(-50%, -50%); align-items: center; text-align: center; }
            </style>

            <div>
                <svg xmlns="http://www.w3.org/2000/svg" width="172" height="172" viewBox="0 0 172 172">
                    <g id="Group_8448" data-name="Group 8448" transform="translate(-554 -158)">
                        <path
                            id="Path_4411"
                            data-name="Path 4411"
                            d="M3806.575-15072.029l22.223,22.221,56.508-56.485"
                            transform="translate(-3206.076 15324.577)"
                            fill="none"
                            stroke="#68b08f"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="17"
                        />
                        <g
                            id="Ellipse_1352"
                            data-name="Ellipse 1352"
                            transform="translate(554 158)"
                            fill="none"
                            stroke="#68b08f"
                            stroke-width="17"
                        >
                            <circle cx="86" cy="86" r="86" stroke="none" />
                            <circle cx="86" cy="86" r="77.5" fill="none" />
                        </g>
                    </g>
                </svg>
            </div>
            <div style="font-size:40px;margin-top:20px;">Password Changed</div>
            <div style="font-size:20px;margin-top:20px;">Please close the window, and you may go back to the previous service and
                enjoy.
            </div>`);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/test_callback')
  testCallback(@Req() req: Request, @Res() res: Response) {
    return res.status(200).send('OK');
  }
}
