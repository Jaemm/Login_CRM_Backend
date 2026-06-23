import { Body, Controller, Get, Headers, Post, Query, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';
import {
  DecodeWebResultDto,
  FetchFwVersionDto,
  GenerateQrWebResultDto,
  LoginSocialDto,
  ShareWebResultDto,
  ShopListDto,
  UpdateFwVersionDto,
} from './app.dto';
import { CountriesListDto, CustomersDto } from './modules/customers/customers.dto';
import { CustomersService } from './modules/customers/customers.service';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { CommonService } from './common/common.service';
import { JwtService } from './jwt/jwt.service';
import * as Jwt from 'jsonwebtoken';

import { Roles } from './common/decorators/roles.decorator';
import { Public } from './common/decorators/public-route.decorator';
import { Role } from './common/enums/role.enum';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly customers: CustomersService,
    private readonly common: CommonService,
    private readonly jwtService: JwtService,
  ) {}

  private async getOptionalAccessUser(req: Request): Promise<any | null> {
    const token = this.jwtService.getTokenFromRequest(req);
    if (!token) {
      return null;
    }

    try {
      const accessUser = Jwt.decode(token);
      if (!accessUser || typeof accessUser !== 'object') {
        return null;
      }

      return accessUser;
    } catch (error) {
      return null;
    }
  }

  /* ----------------------------- Translation ----------------------------- */

  @Public()
  @Get('/poeditor')
  async poeditor() {
    return this.common.fetchTranslation();
  }

  /* ----------------------------- Shops ----------------------------- */

  @ApiTags('Customers')
  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Get('shops-list')
  async shopList(@Res() res: Response, @Query() params: ShopListDto) {
    const shops = await this.appService.shopList(params);
    return res.status(200).send({ shops });
  }

  @ApiTags('Additional')
  @ApiBearerAuth()
  @Roles(Role.Consultant, Role.Customer)
  @Get('shops')
  async getShops(@Res() res: Response, @Query() params: ShopListDto) {
    const shops = await this.appService.shopList(params);
    return res.status(200).send({ shops });
  }

  /* ----------------------------- Device ----------------------------- */

  @ApiTags('Additional')
  @Public()
  @Get('fetch-fw-version')
  async fetchFwVersion(@Res() res: Response, @Query() params: FetchFwVersionDto) {
    const version = await this.appService.fetchFwVersion(params);
    return res.status(200).send(version);
  }

  @ApiTags('Additional')
  @Public()
  @Post('update-fw-version')
  async updateFwVersion(@Res() res: Response, @Query() params: UpdateFwVersionDto) {
    const result = await this.appService.updateFwVersion(params);
    return res.status(200).send(result);
  }

  /* ----------------------------- Basic Info ----------------------------- */

  @ApiTags('Additional')
  @ApiBearerAuth()
  @Roles(Role.Consultant, Role.Customer)
  @Get('basic-details')
  async basicDetails(@Res() res: Response) {
    const result = await this.appService.basicDetails();
    return res.status(200).send(result);
  }

  @ApiTags('Additional')
  @ApiBearerAuth()
  @Roles(Role.Consultant, Role.Customer)
  @Get('basic-details-customers')
  async basicDetails_customers(@Res() res: Response) {
    const result = await this.appService.basicDetails();
    return res.status(200).send(result);
  }

  @ApiTags('Customers')
  @ApiBearerAuth()
  @Get('countries-list')
  async countriesList(@Res() res: Response, @Query() params: CountriesListDto) {
    const countries = await this.appService.countriesList(params);
    return res.status(200).send({ countries });
  }

  /* ----------------------------- Auth ----------------------------- */

  @ApiTags('Customers')
  @Public()
  @Post('login')
  @ApiHeader({
    name: 'X-CONSULTANT-COMPANY',
    description: 'Company for the request',
    required: false,
  })
  async login(
    @Res() res: Response,
    @Body() body: CustomersDto,
    @Headers('x-locale') locale: string,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ) {
    const { app_id, password, email } = body;
    const result = await this.customers.login(email, password, Number(app_id), locale, company);
    return res.status(200).send(result);
  }

  @ApiTags('Customers')
  @ApiBearerAuth()
  @Roles(Role.Customer)
  @Post('logout')
  async logout(@Res() res: Response, @Req() req: Request) {
    const id = (req as any).user?.id;
    const result = await this.appService.logout(id);
    return res.status(200).send(result);
  }

  @ApiTags('Customers')
  @Public()
  @Post('login/social')
  @ApiHeader({
    name: 'X-CONSULTANT-COMPANY',
    description: 'Company for the request',
    required: false,
  })
  async loginSocial(
    @Res() res: Response,
    @Body() body: LoginSocialDto,
    @Headers('X-CONSULTANT-COMPANY') company: string,
  ) {
    const result = await this.appService.loginSocial(body, company);
    return res.status(200).send(result);
  }

  /* ----------------------------- Web Result ----------------------------- */

  @Public()
  @ApiBody({
    type: ShareWebResultDto,
    examples: {
      legacy: {
        summary: 'Legacy analysis server',
        value: {
          batchId: 12345,
          customer_id: 6789,
          app_id: 102,
          consultant_company_id: 1,
          locale: 'en',
          type: 'skin',
          analysis: 'cndp-skin',
          analysis_server_version: 'legacy',
          webresult_base_url: 'chowis',
        },
      },
      integrated: {
        summary: 'Integrated analysis server',
        value: {
          batchId: 12345,
          customer_id: 6789,
          app_id: 102,
          consultant_company_id: 1,
          locale: 'en',
          type: 'skin',
          analysis: 'integrated-skin',
          analysis_server_version: 'integrated',
          webresult_base_url: 'choicetech',
        },
      },
    },
  })
  @Public()
  @Post('/web-results/share-results')
  async webResultSharing(@Body() body: ShareWebResultDto, @Req() req: any, @Res() res: Response) {
    const accessUser = (await this.getOptionalAccessUser(req)) ?? req.user ?? null;
    const parsedConsultantId = Number(accessUser?.id);
    const consultantId = Number.isFinite(parsedConsultantId) ? parsedConsultantId : null;
    const tokenConsultantCompanyId = accessUser?.consultant_company_id ?? null;
    await this.appService.webResultSending(body, consultantId, tokenConsultantCompanyId);
    return res.send({ message: 'Email sent!' });
  }

  @Public()
  @ApiBody({
    type: GenerateQrWebResultDto,
    examples: {
      legacy: {
        summary: 'Legacy analysis server',
        value: {
          batchId: 12345,
          customer_id: 6789,
          app_id: 102,
          consultant_company_id: 1,
          locale: 'en',
          type: 'skin',
          analysis: 'cndp-skin',
          analysis_server_version: 'legacy',
          webresult_base_url: 'chowis',
        },
      },
      integrated: {
        summary: 'Integrated analysis server',
        value: {
          batchId: 12345,
          customer_id: 6789,
          app_id: 102,
          consultant_company_id: 1,
          locale: 'en',
          type: 'skin',
          analysis: 'integrated-skin',
          analysis_server_version: 'integrated',
          webresult_base_url: 'choicetech',
        },
      },
    },
  })
  @Post('/web-results/generate_qr_code')
  async generateQRCodeUrl(@Body() body: GenerateQrWebResultDto, @Req() req: any) {
    const accessUser = (await this.getOptionalAccessUser(req)) ?? req.user ?? null;
    const parsedConsultantId = Number(accessUser?.id);
    const consultantId = Number.isFinite(parsedConsultantId) ? parsedConsultantId : null;
    const tokenConsultantCompanyId = accessUser?.consultant_company_id ?? null;
    const url = await this.appService.generateWebResultQrCode(
      body,
      consultantId,
      tokenConsultantCompanyId,
    );

    return {
      qr_code_url: `${process.env.URL}/v1/api/serve_qr_code?url=${url}`,
    };
  }

  @Public()
  @Get('serve_qr_code')
  async serveQrCode(@Query('url') url: string, @Res() res: Response) {
    const qrCode = await this.appService.generateQrCode(url);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="qrcode.png"');
    return res.send(qrCode);
  }

  @Public()
  @Post('/web-results/decode_web_result')
  async decodeWebResult(@Body() body: DecodeWebResultDto) {
    return this.appService.decodeWebResultToken(body.token);
  }

  /* ----------------------------- Internal ----------------------------- */

  @ApiTags('generate-token')
  @Post('generate-token')
  @ApiOperation({ summary: 'Generate JWT token for internal service authorization' })
  async generateToken(@Body() body: GenerateTokenDto) {
    const token = await this.appService.generateToken(body);
    return { token };
  }
}
