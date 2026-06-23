import { Controller } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';
import { SkinColorGroupsService } from './skinColorGroups.service';

@ApiTags('skinColorGroups')
@Controller('skinColorGroups')
export class SkinColorGroupsController {
  constructor(private readonly skinColorGroupsService: SkinColorGroupsService) {}
}
