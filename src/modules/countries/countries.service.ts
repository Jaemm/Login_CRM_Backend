import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelectByString, Like, Repository } from 'typeorm';
import { Countries } from '@/src/common/entities/crmEntities/Countries.entity';
import { CountriesDto } from './countries.dto';
import { CommonService } from '@/src/common/common.service';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Countries)
    private readonly countriesRepository: Repository<Countries>,
    private readonly commonService: CommonService,
  ) {}

  private async validateEntity<T>(entity: T | null): Promise<T> {
    if (!entity) this.commonService.throwNotFoundError();
    return entity;
  }

  async findOneCountryById(id: number) {
    const country = await this.countriesRepository.findOne({ where: { id } });
    return this.validateEntity(country);
  }

  async findOneCountry(conditions?: any, selections?: string[], includes?: string[]) {
    const country = await this.countriesRepository.findOne({
      where: conditions,
      select: (selections as FindOptionsSelectByString<Countries>) ?? ['id', 'name'],
      relations: includes ?? [],
    });
    return this.validateEntity(country);
  }

  async findCountry(conditions?: any, selections?: string[], includes?: string[]) {
    const countries = await this.countriesRepository.find({
      where: conditions ?? {},
      select: selections as FindOptionsSelectByString<Countries>,
      relations: includes ?? [],
    });
    return this.validateEntity(countries);
  }

  async countries(params: CountriesDto) {
    const { search } = params;
    const conditions = search ? { name: Like(`%${search}%`) } : {};
    return this.findCountry(conditions, ['id', 'name', 'phone_code', 'country_code']);
  }

  async findCountriesByName(searchDto: CountriesDto) {
    const search = searchDto.search?.toLowerCase() ?? '';
    return await this.countriesRepository
      .createQueryBuilder('Countries')
      .select(['Countries.id', 'Countries.name', 'Countries.phone_code', 'Countries.country_code'])
      .where('LOWER(Countries.name) LIKE :search', { search: `%${search}%` })
      .getMany();
  }
}
