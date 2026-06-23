import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, FindOptionsSelectByString, Repository } from 'typeorm';
import { Licenses } from '@/src/common/entities/crmEntities/Licenses.entity';
import { LicenseHistories } from '@/src/common/entities/crmEntities/LicenseHistories.entity';
import { ApplicationLicenses } from '@/src/common/entities/crmEntities/ApplicationLicenses.entity';
import { CommonService } from '@/src/common/common.service';

@Injectable()
export class LicenceService {
  constructor(
    @InjectRepository(Licenses)
    private readonly licenceRepository: Repository<Licenses>,

    @InjectRepository(LicenseHistories)
    private readonly licenseHistoryRepository: Repository<LicenseHistories>,

    @InjectRepository(ApplicationLicenses)
    private readonly applicationLicenseRepository: Repository<ApplicationLicenses>,

    private readonly commonService: CommonService,
  ) {}

  async findOneLicence(id: number) {
    const licence = await this.licenceRepository.findOne({ where: { id } });
    if (!licence) {
      this.commonService.throwNotFoundError();
    }
    return licence;
  }

  async findLicence(conditions?: any, selections?: string[], includes?: string[]) {
    const licences = await this.licenceRepository.find({
      where: conditions,
      select: selections as FindOptionsSelectByString<Licenses>,
      relations: includes ?? [],
    });

    if (!licences || licences.length === 0) {
      this.commonService.throwNotFoundError();
    }

    return licences;
  }

  async findApplicationLicence(conditions?: any, selections?: string[], includes?: string[]) {
    return await this.applicationLicenseRepository.findOne({
      where: conditions,
      select: (selections as FindOptionsSelect<ApplicationLicenses>) ?? [],
      relations: includes ?? [],
    });
  }

  async findLicenceHistories(
    conditions?: any,
    order?: any,
    selections?: string[],
    includes?: string[],
  ) {
    const histories = await this.licenseHistoryRepository.find({
      where: conditions,
      select: selections as FindOptionsSelect<LicenseHistories>,
      relations: includes ?? [],
      order,
    });

    if (!histories || histories.length === 0) {
      this.commonService.throwNotFoundError();
    }

    return histories;
  }

  async findLicenceHistory(
    conditions?: any,
    order?: any,
    selections?: string[],
    includes?: string[],
  ) {
    const history = await this.licenseHistoryRepository.findOne({
      where: conditions,
      select: selections as FindOptionsSelect<LicenseHistories>,
      relations: includes ?? [],
      order,
    });

    if (!history) {
      this.commonService.throwNotFoundError();
    }

    return history;
  }

  async createLicenceHistory(data: Partial<LicenseHistories>) {
    const history = this.licenseHistoryRepository.create(data);
    return this.licenseHistoryRepository.save(history);
  }
}
