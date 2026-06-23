import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultantPositions } from '@/src/common/entities/crmEntities/ConsultantPositions.entity';
import { CommonService } from '@/src/common/common.service';

@Injectable()
export class ConsultantPositionsService {
  constructor(
    @InjectRepository(ConsultantPositions)
    private readonly repository: Repository<ConsultantPositions>,
    private readonly commonService: CommonService,
  ) {}

  async findOneConsultantPosition(id: number): Promise<ConsultantPositions> {
    const position = await this.repository.findOne({ where: { id } });

    if (!position) this.commonService.throwNotFoundError();

    return position;
  }
}
