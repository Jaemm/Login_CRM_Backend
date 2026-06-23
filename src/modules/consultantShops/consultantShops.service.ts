import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelectByString, Repository } from 'typeorm';
import { ConsultantShops } from '@/src/common/entities/crmEntities/ConsultantShops.entity';
import { CommonService } from '@/src/common/common.service';

@Injectable()
export class ConsultantShopsService {
  constructor(
    @InjectRepository(ConsultantShops)
    private readonly consultantShopsRepository: Repository<ConsultantShops>,
    private readonly commonService: CommonService,
  ) {}

  async findOneConsultantShops(id: number) {
    const shop = await this.consultantShopsRepository.findOne({ where: { id } });

    if (!shop) {
      this.commonService.throwNotFoundError();
    }

    return shop;
  }

  async findConsultantShops(conditions?: any, selections?: string[], includes?: string[]) {
    const shops = await this.consultantShopsRepository.find({
      where: conditions,
      select: selections ? (selections as FindOptionsSelectByString<ConsultantShops>) : undefined,
      relations: includes ?? [],
    });
    return shops ?? [];
  }
}
