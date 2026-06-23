import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CountriesService } from './countries.service';
import { CountriesDto } from './countries.dto';
import { Role } from '@/src/common/enums/role.enum';
import { Roles } from '@/src/common/decorators/roles.decorator';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @ApiTags('Additional')
  @ApiBearerAuth()
  @Roles(Role.Consultant, Role.Customer)
  @Get()
  async getCountries(@Query() params: CountriesDto): Promise<any> {
    const result = await this.countriesService.findCountriesByName(params);
    return { countries: result };
  }
}
