import { Controller } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { GendersService } from './genders.service';

@ApiTags('genders')
@Controller('genders')
export class GendersController {
  constructor(private readonly gendersService: GendersService) {}
}
