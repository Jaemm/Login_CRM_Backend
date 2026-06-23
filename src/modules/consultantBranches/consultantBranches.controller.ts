import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsultantBranchesService } from './consultantBranches.service';

@ApiTags('Consultant Branches')
@Controller('consultant-branches')
export class ConsultantBranchesController {
  constructor(private readonly consultantBranchesService: ConsultantBranchesService) {}
}
