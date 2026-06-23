import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ethnicities } from '@/src/common/entities/crmEntities/Ethnicities.entity';
import { CommonService } from '@/src/common/common.service';

@Injectable()
export class EthinicitiesService {
  constructor(
    @InjectRepository(Ethnicities)
    private readonly ethinicitiesRepository: Repository<Ethnicities>,

    private readonly commonService: CommonService,
  ) {}

  async findOneEthinicities(id: string) {
    const ethinicity = await this.ethinicitiesRepository.findOne({
      where: {
        id: id,
      },
    });
    if (!ethinicity) {
      this.commonService.throwNotFoundError();
    }
    return ethinicity;
  }

  async findEthinicities(conditions?: any, selections?: string[], includes?: string[]) {
    const ethinicity = await this.ethinicitiesRepository.find({
      where: conditions,
      select: { id: true, name: true, code: true },
      relations: includes,
    });
    if (!ethinicity) {
      this.commonService.throwNotFoundError();
    }
    return ethinicity.map((item) => ({
      ...item,
      id: Number(item.id),
    }));
  }
}
