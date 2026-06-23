import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelectByString, ILike, Repository } from 'typeorm';
import { ConsultantShops } from '@/src/common/entities/crmEntities/ConsultantShops.entity';
import { StoreCreateDto, StoreGetDto } from './stores.dto';
import { ConsultantCompanyService } from '../consultantCompany/consultantCompany.service';
import { CountriesService } from '../countries/countries.service';
import { CommonService } from '@/src/common/common.service';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(ConsultantShops)
    private readonly storeRepository: Repository<ConsultantShops>,
    private readonly companyService: ConsultantCompanyService,
    private readonly countryService: CountriesService,
    private readonly commonService: CommonService,
  ) {}

  async findOneStoreById(id: number) {
    const store = await this.storeRepository.findOne({ where: { id } });
    if (!store) this.commonService.throwNotFoundError();
    return store;
  }

  async findOneStore(conditions?: any, selections?: string[], includes?: string[]) {
    const store = await this.storeRepository.findOne({
      where: conditions,
      select: selections as FindOptionsSelectByString<ConsultantShops>,
      relations: includes ?? [],
    });
    if (!store) this.commonService.throwNotFoundError();
    return store;
  }

  async findStores(conditions?: any, selections?: string[], includes?: string[]) {
    const filteredConditions = Object.fromEntries(
      Object.entries(conditions || {}).filter(([, v]) => v !== null && v !== undefined),
    );

    return await this.storeRepository.find({
      where: filteredConditions,
      select: selections as FindOptionsSelectByString<ConsultantShops>,
      relations: includes ?? [],
    });
  }

  async insertStore(storeInput: Partial<ConsultantShops>) {
    const newStore = this.storeRepository.create(storeInput);
    return await this.storeRepository.save(newStore);
  }

  async create(body: StoreCreateDto) {
    const { name, postal_code, consultant_company_id, country_id } = body;

    const [company, country] = await Promise.all([
      this.companyService.getOneCompany(Number(consultant_company_id)),
      this.countryService.findOneCountryById(Number(country_id)),
    ]);

    if (!company || !country) this.commonService.throwNotFoundError();

    const store = await this.insertStore({
      name,
      postal_code,
      country_id: Number(country_id),
      consultant_company_id: Number(consultant_company_id),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.commonService.generateMessage(store ? 'Success!' : 'Something went wrong!');
  }

  async getStore(query: StoreGetDto) {
    const { search, consultant_company_id } = query;

    const stores = await this.findStores(
      {
        name: search ? ILike(`%${search}%`) : undefined,
        consultant_company_id,
      },
      ['id', 'name', 'country_id', 'consultant_company_id', 'createdAt', 'updatedAt'],
    );

    if (!stores || stores.length === 0) {
      this.commonService.throwNotFoundError();
    }

    stores.forEach((item: any) => {
      item.country_name = item.getContryName;
    });

    return stores;
  }

  async delete(id: number) {
    await this.findOneStoreById(id);

    const result = await this.storeRepository.delete(id);

    if (!result.affected) {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.CUSTOM_ERROR);
    }

    return this.commonService.generateMessage('Success!');
  }
}
