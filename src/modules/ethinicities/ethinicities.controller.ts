import { Controller } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { EthinicitiesService } from './ethinicities.service';

@ApiTags('ethinicities')
@Controller('ethinicities')
export class EthinicitiesController {
  constructor(private readonly ethinicitiesService: EthinicitiesService) {}
}
