import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebResultManagement } from '@/src/common/entities/crmEntities/WebResultManagement.entity';
import { CommonService } from '@/src/common/common.service';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class WebResultService {
  constructor(
    @InjectRepository(WebResultManagement)
    private readonly WebResultRepository: Repository<WebResultManagement>,
    private readonly commonService: CommonService,
  ) {}

  async findOneWebResult(id: number) {
    return await this.WebResultRepository.findOne({ where: { id } });
  }

  async findOneWebResultbatchCustomer(batch_id: number, customer_id: number) {
    return await this.WebResultRepository.createQueryBuilder('web_result_management')
      .where('web_result_management.batch_id = :batch_id', { batch_id })
      .andWhere('web_result_management.customer_id = :customer_id', { customer_id })
      .orderBy('web_result_management.created_at', 'DESC')
      .limit(1)
      .getOne();
  }

  async findWebResult(conditions?: any, selections?: string[], includes?: string[]) {
    const webResult = await this.WebResultRepository.find({
      where: conditions,
      relations: includes,
    });

    if (!webResult || webResult.length === 0) {
      this.commonService.throwNotFoundError();
    }

    return webResult;
  }

  saveWebResult(data: any) {
    return this.WebResultRepository.save(data);
  }

  async updateResult(webResult: any) {
    await this.WebResultRepository.update(webResult.id, webResult);
  }

  async expiredResult(batch_id: number, customer_id: number) {
    const webResult = await this.findOneWebResultbatchCustomer(batch_id, customer_id);

    if (!webResult) {
      return true;
    }

    const now = new Date();

    if (webResult.checked_at === null || webResult.checked_at === undefined) {
      webResult.checked_at = now;
      await this.updateResult(webResult);
      return true;
    }

    const diffInMinutes = (now.getTime() - new Date(webResult.checked_at).getTime()) / (1000 * 60);

    if (diffInMinutes >= 30) {
      webResult.expired = true;
      webResult.expired_at = now;
      await this.updateResult(webResult);

      throw ErrorExceptionFactory.createFromStatus('forbidden', ErrorStatus.PERMISSION_DENIED);
    }

    return true;
  }
}
