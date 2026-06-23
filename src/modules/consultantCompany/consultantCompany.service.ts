import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelectByString, Repository } from 'typeorm';
import { ConsultantCompanies } from '@/src/common/entities/crmEntities/ConsultantCompanies.entity';
import { ActiveStorageAttachments } from '@/src/common/entities/crmEntities/ActiveStorageAttachments.entity';
import { ActiveStorageService } from '../activeStorage/activeStorage.service';

@Injectable()
export class ConsultantCompanyService {
  constructor(
    @InjectRepository(ConsultantCompanies)
    private readonly companyRepository: Repository<ConsultantCompanies>,
    @InjectRepository(ActiveStorageAttachments)
    private readonly activeStorage: Repository<ActiveStorageAttachments>,
    private readonly activeStorageService: ActiveStorageService,
  ) {}

  async getCompaniesFiles(recordId: string) {
    const imageCustomization = await this.activeStorage.find({
      where: { recordId },
      select: {
        blob: {
          metadata: true,
          activeStorageAttachments: true,
          checksum: true,
          contentType: true,
          key: true,
          filename: true,
        },
        name: true,
        recordType: true,
      },
      relations: ['blob'],
    });
    return imageCustomization;
  }

  async getOneCompany(id: number): Promise<ConsultantCompanies | undefined> {
    const consultant: any = await this.companyRepository.findOne({
      where: { id },
      relations: ['consultantCustomzations', 'applications'],
    });

    if (consultant) {
      const custom = consultant.consultantCustomzations?.[0] ?? {};
      const fields = [
        'primary_color_code',
        'secondary_color_code',
        'font',
        'program_color_code',
        'top_color_code',
        'text_icon_color_code',
        'pie_chart_color_1',
        'pie_chart_color_2',
        'pie_chart_color_3',
        'pie_chart_color_4',
        'pie_chart_color_5',
        'pie_chart_points_color',
        'data_exchange_url',
        'font_color_1',
        'font_color_2',
        'pmx',
        'active',
        'chowis_logo',
        'channel_io',
        'medical_version',
        'result_expiration_time',
        'image_upload',
        'representative_score_type',
        'representative_score_skin_type_measurement_id',
        'representative_score_hair_type_measurement_id',
        'qr_code_enabled',
        'screen_saver_enabled',
        'use_result_share',
      ];

      for (const field of fields) {
        consultant[field] = custom[field] ?? (field === 'channel_io' ? false : null);
      }

      delete consultant.consultantCustomzations;
    }

    return consultant;
  }

  async getOneCompanyByFilters(conditions?: any, selections?: string[], includes?: string[]) {
    return this.companyRepository.findOne({
      where: conditions ?? {},
      select: selections as FindOptionsSelectByString<ConsultantCompanies>,
      relations: includes ?? [],
    });
  }

  async getCompanies(conditions?: any, selections?: string[], includes?: string[]) {
    return this.companyRepository.find({
      where: conditions ?? {},
      select: selections as FindOptionsSelectByString<ConsultantCompanies>,
      relations: includes ?? [],
    });
  }

  async deleteConsultantCompany(id: number) {
    const company = await this.companyRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Consultant company not found');
    }

    if (id === 1) {
      throw new ConflictException('Default consultant company cannot be deleted');
    }

    const defaultCompanyId = 1;
    const defaultCompany = await this.companyRepository.findOne({
      where: { id: defaultCompanyId },
    });

    if (!defaultCompany) {
      throw new NotFoundException('Default consultant company not found');
    }

    await this.companyRepository.manager.transaction(async (manager) => {
      await manager.query(
        'UPDATE consultants SET consultant_company_id = $1, updated_at = NOW() WHERE consultant_company_id = $2',
        [defaultCompanyId, id],
      );
      await manager.query(
        'UPDATE applications SET consultant_company_id = $1, updated_at = NOW() WHERE consultant_company_id = $2',
        [defaultCompanyId, id],
      );
      await manager.query(
        'UPDATE devices SET consultant_company_id = $1 WHERE consultant_company_id = $2',
        [defaultCompanyId, id],
      );
      await manager.query(
        'UPDATE consultant_branches SET consultant_company_id = $1, updated_at = NOW() WHERE consultant_company_id = $2',
        [defaultCompanyId, id],
      );
      await manager.query(
        'UPDATE consultant_shops SET consultant_company_id = $1, updated_at = NOW() WHERE consultant_company_id = $2',
        [defaultCompanyId, id],
      );
      await manager.query(
        'UPDATE chowis_service_license_mangment SET consultant_company_id = $1, updated_at = NOW() WHERE consultant_company_id = $2',
        [defaultCompanyId, id],
      );
      await manager.query('DELETE FROM consultant_customzations WHERE consultant_company_id = $1', [
        id,
      ]);
      await manager.delete(ConsultantCompanies, { id });
    });

    await this.activeStorageService.deleteActiveStorageItems('ConsultantCompany', String(id));

    return { message: 'Successfully remove consultant company' };
  }
}
