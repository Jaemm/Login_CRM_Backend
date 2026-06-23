import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultantBranches } from '@/src/common/entities/crmEntities/ConsultantBranches.entity';
import { CommonService } from '@/src/common/common.service';

@Injectable()
export class ConsultantBranchesService {
  constructor(
    @InjectRepository(ConsultantBranches)
    private readonly consultantBranchesRepository: Repository<ConsultantBranches>,
    private readonly commonService: CommonService,
  ) {}

  async findOne(id: string) {
    const branch = await this.consultantBranchesRepository.findOne({ where: { id } });

    if (!branch) {
      this.commonService.throwNotFoundError();
    }

    return branch;
  }
}
