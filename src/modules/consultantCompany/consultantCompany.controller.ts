import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConsultantCompanyService } from './consultantCompany.service';
import { Roles } from '@/src/common/decorators/roles.decorator';
import { Role } from '@/src/common/enums/role.enum';

@ApiTags('consultant_company')
@Controller('consultant_company')
export class ConsultantCompanyController {
  constructor(private readonly consultantCompanyService: ConsultantCompanyService) {}

  @ApiBearerAuth()
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  async deleteConsultantCompany(@Param('id') id: string) {
    return this.consultantCompanyService.deleteConsultantCompany(Number(id));
  }
}
