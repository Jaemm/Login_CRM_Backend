import { Body, Controller, HttpCode, HttpStatus, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomerConsentsService } from './customerConsents.service';
import { CustomerConsentsDto, WithdrawCustomerConsentDto } from './customerConsents.dto';
import { Roles } from '@/src/common/decorators/roles.decorator';
import { Role } from '@/src/common/enums/role.enum';

@ApiTags('GDPR')
@Controller('customer_consents')
export class CustomerConsentsController {
  constructor(private readonly customerConsentsService: CustomerConsentsService) {}

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createForCustomer(@Body() customerConsents: CustomerConsentsDto) {
    return this.customerConsentsService.createCustomerConsents(customerConsents);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('for_consultant_create')
  async createForConsultant(@Body() customerConsents: CustomerConsentsDto) {
    return this.customerConsentsService.createCustomerConsentsForConsultant(customerConsents);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant)
  @ApiQuery({ name: 'id' })
  @Put('for_consultant_update')
  async updateForConsultant(@Query('id') id: string, @Body() customerConsents: CustomerConsentsDto) {
    return this.customerConsentsService.updateCustomerConsentsForConsultant(id, customerConsents);
  }

  @ApiBearerAuth()
  @Roles(Role.Customer)
  @ApiQuery({ name: 'id' })
  @Put('update')
  async updateForCustomer(@Query('id') id: string, @Body() customerConsents: CustomerConsentsDto) {
    return this.customerConsentsService.updateCustomerConsents(id, customerConsents);
  }

  @ApiBearerAuth()
  @Roles(Role.Admin, Role.Customer, Role.Consultant)
  @HttpCode(HttpStatus.OK)
  @Post('withdraw')
  async withdraw(@Body() payload: WithdrawCustomerConsentDto) {
    return this.customerConsentsService.withdrawCustomerConsent(payload);
  }

}
