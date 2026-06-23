import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ActiveStorageAttachments } from '@/src/common/entities/crmEntities/ActiveStorageAttachments.entity';
import { ActiveStorageBlobs } from '@/src/common/entities/crmEntities/ActiveStorageBlobs.entity';
import { AwsS3Service } from '@/src/common/awsS3/awsS3.service';

@Injectable()
export class ActiveStorageService {
  constructor(
    @InjectRepository(ActiveStorageAttachments)
    private readonly attachmentsRepository: Repository<ActiveStorageAttachments>,

    @InjectRepository(ActiveStorageBlobs)
    private readonly blobsRepository: Repository<ActiveStorageBlobs>,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  private getCloudfrontBaseUrl() {
    const domain = process.env.CLOUDFRONT_URL || 'https://d37orfceubonsg.cloudfront.net';
    return domain.startsWith('http') ? domain : `https://${domain}`;
  }

  private buildCloudfrontUrl(key: string, filename?: string | null) {
    const url = new URL(`${this.getCloudfrontBaseUrl()}/${key}`);

    if (filename) {
      url.searchParams.set('download_name', filename);
    }

    return url.toString();
  }

  async getActiveStorageItems(recordType: string, recordId: string) {
    const env = process.env.ENV;
    const URL =
      env === 'production'
        ? 'https://example.com/v1/api'
        : 'https://example.com/v1/api';

    const attachments = await this.attachmentsRepository.findBy({ recordType, recordId });

    const items = await Promise.all(
      attachments.map(async (attachment) => {
        const blob = await this.blobsRepository.findOneBy({ id: attachment.blobId });
        const url = blob?.key ? `${URL}/image/${blob.key}` : null;

        return { type: attachment.name, url };
      }),
    );

    return items;
  }

  async getActiveStorageDownloadUrl(
    recordType: string,
    recordId: string,
    attachmentName?: string,
  ): Promise<string | null> {
    const attachment = await this.attachmentsRepository.findOne({
      where: attachmentName
        ? { recordType, recordId, name: attachmentName }
        : { recordType, recordId },
      order: { createdAt: 'DESC' },
    });

    if (!attachment) {
      return null;
    }

    const blob = await this.blobsRepository.findOneBy({ id: attachment.blobId });
    if (!blob?.key) {
      return null;
    }

    return this.buildCloudfrontUrl(blob.key, blob.filename);
  }

  async deleteActiveStorageItems(recordType: string, recordId: string) {
    const attachments = await this.attachmentsRepository.find({
      where: { recordType, recordId },
      relations: ['blob'],
    });

    if (!attachments.length) {
      return { count: 0 };
    }

    const blobIds = attachments.map((attachment) => attachment.blobId).filter(Boolean);
    const blobReferenceRows = blobIds.length
      ? await this.attachmentsRepository
          .createQueryBuilder('attachment')
          .select('attachment.blobId', 'blobId')
          .addSelect('COUNT(*)', 'referenceCount')
          .where('attachment.blobId IN (:...blobIds)', { blobIds })
          .groupBy('attachment.blobId')
          .getRawMany()
      : [];

    const blobReferenceCounts = new Map<string, number>(
      blobReferenceRows.map((row) => [String(row.blobId), Number(row.referenceCount) || 0]),
    );

    for (const attachment of attachments) {
      const blob = attachment.blob ?? (await this.blobsRepository.findOneBy({ id: attachment.blobId }));

      const blobRefCount = blob?.id ? blobReferenceCounts.get(String(blob.id)) ?? 0 : 0;

      if (blob?.key && blobRefCount <= 1) {
        await this.awsS3Service.deleteObject(blob.key);
      }
    }

    await this.attachmentsRepository.delete({
      recordType,
      recordId,
    });

    if (blobIds.length) {
      const blobsToDelete = blobIds.filter((blobId) => (blobReferenceCounts.get(String(blobId)) ?? 0) <= 1);
      if (blobsToDelete.length) {
        await this.blobsRepository.delete({ id: blobsToDelete as any });
      }
    }

    return { count: attachments.length };
  }
}
