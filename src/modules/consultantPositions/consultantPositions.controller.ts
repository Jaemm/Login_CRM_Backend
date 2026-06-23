import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsultantPositionsService } from './consultantPositions.service';

@ApiTags('consultantPositions')
@Controller('consultantPositions')
export class ConsultantPositionsController {
  constructor(private readonly consultantPositionsService: ConsultantPositionsService) {}
}
