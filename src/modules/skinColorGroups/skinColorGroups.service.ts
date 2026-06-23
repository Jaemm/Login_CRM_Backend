import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkinColorGroups } from '@/src/common/entities/crmEntities/SkinColorGroups.entity';
import { CommonService } from '@/src/common/common.service';

@Injectable()
export class SkinColorGroupsService {
  constructor(
    @InjectRepository(SkinColorGroups)
    private readonly skinColorGroupsRepository: Repository<SkinColorGroups>,

    private readonly commonService: CommonService,
  ) {}

  async findOneskinColorGroups(id: string) {
    const skinColorGroup = await this.skinColorGroupsRepository.findOne({ where: { id } });

    if (!skinColorGroup) {
      this.commonService.throwNotFoundError();
    }

    return skinColorGroup;
  }

  async findSkinColorGroups(conditions?: any, selections?: string[], includes?: string[]) {
    const skinColorGroups = await this.skinColorGroupsRepository.find({
      where: conditions,
      select: { id: true, name: true, code: true },
      relations: includes ?? [],
    });

    if (!skinColorGroups || skinColorGroups.length === 0) {
      this.commonService.throwNotFoundError();
    }

    return skinColorGroups.map((item) => ({
      ...item,
      id: Number(item.id),
    }));
  }
}
