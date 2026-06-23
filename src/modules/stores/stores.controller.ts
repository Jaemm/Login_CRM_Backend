import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StoreService } from './stores.service';
import { StoreCreateDto, StoreGetDto } from './stores.dto';
import { Roles } from '@/src/common/decorators/roles.decorator';
import { Role } from '@/src/common/enums/role.enum';

@ApiTags('Stores')
@Controller()
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @ApiBearerAuth()
  @Roles(Role.Consultant, Role.Customer)
  @HttpCode(HttpStatus.OK)
  @Post('create_store')
  async create(@Body() body: StoreCreateDto) {
    return await this.storeService.create(body);
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant, Role.Customer)
  @Get('stores')
  async getStore(@Query() query: StoreGetDto) {
    const stores = await this.storeService.getStore(query);
    return { stores };
  }

  @ApiBearerAuth()
  @Roles(Role.Consultant, Role.Customer)
  @Delete('delete_store/:id')
  async delete(@Param('id') id: string) {
    const response = await this.storeService.delete(Number(id));
    return response;
  }
}
