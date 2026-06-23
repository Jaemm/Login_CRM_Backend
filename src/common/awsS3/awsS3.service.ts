import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  GetObjectCommandOutput,
  DeleteObjectCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { ErrorStatus } from '../constants/error-status';
import { ErrorExceptionFactory } from '../middleWare/exceptions/exceptionHandling/error-exception.factory';
import { MonitoringService } from '@/src/modules/monitoring/monitoring.service';

type BufferedGetObjectOutput = Omit<GetObjectCommandOutput, 'Body'> & {
  Body?: Buffer;
};

type UploadResult = PutObjectCommandOutput & {
  Bucket: string;
  Key: string;
  Location: string;
};

@Injectable()
export class AwsS3Service {
  private readonly s3Client: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly monitoringService: MonitoringService,
  ) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  async uploadFile(fileContent: Buffer, fileName: string) {
    return this.putObject(fileContent, `${fileName}.jpg`);
  }

  async getImageCloudS3(key: string): Promise<BufferedGetObjectOutput> {
    const stopS3Timer = this.monitoringService.startS3Timer('get_object');

    if (this.configService.get('REGION') === 'CHINA') {
    }

    let response: GetObjectCommandOutput;
    try {
      response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.getBucketName(),
          Key: key,
        }),
      );
    } catch (error: any) {
      const statusCode = Number(error?.$metadata?.httpStatusCode);
      const errorName = error?.name || error?.Code;

      if (statusCode === 404 || errorName === 'NoSuchKey') {
        stopS3Timer('not_found');
        throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
      }

      stopS3Timer('failure');
      throw error;
    }

    stopS3Timer('success');
    return {
      ...response,
      Body: response.Body ? Buffer.from(await response.Body.transformToByteArray()) : undefined,
    };
  }

  getImageArgs(fileUsage: string | null = null, route: string) {
    const hash = uuid();
    const host = this.getHost();
    const url = host + route + hash;
    const filename = `${hash}_${fileUsage}.jpg`;
    const sys_url = `${fileUsage}_${hash}`;
    return { hash, url, filename, sys_url };
  }

  pngFileFilter(fileName: string) {
    const ext = path.extname(fileName);
    if (ext !== '.png') {
      throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
    }
    return true;
  }

  async getImagesFromCloud(sysUrl: string) {
    if (!sysUrl)
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    const image = await this.getImageCloudS3(`${sysUrl}`);
    return image;
  }

  async uploadBrochure(fileContent: Buffer, fileName: string) {
    return this.putObject(fileContent, `${fileName}.pdf`);
  }

  async deleteObject(key: string) {
    if (!key) {
      return;
    }

    const bucket = this.getBucketName();
    if (!bucket) {
      return;
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  getFileArgs(fileUsage: string | null = null, route: string) {
    const hash = uuid();
    const host = this.getHost();
    const url = host + route + hash;
    const filename = `${hash}_${fileUsage}.pdf`;
    const sys_url = `${fileUsage}_${hash}`;
    return { hash, url, filename, sys_url };
  }

  async getFileFromS3(sysUrl: string) {
    if (!sysUrl)
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    const image = await this.getImageCloudS3(`${sysUrl}.pdf`);
    return image;
  }

  async anyFileUpload(fileContent: Buffer, fileName: string, ext: string, realFileName: string) {
    return this.putObject(fileContent, `${fileName}${ext}`, {
      Metadata: {
        'original-filename': realFileName,
      },
    });
  }

  getAnyFileArgs(fileUsage: string | null = null, ext: string, route: string) {
    const hash = uuid();
    const host = this.getHost();
    const url = host + route + hash;
    const filename = `${hash}_${fileUsage + ext}`;
    const sys_url = `${fileUsage}_${hash}`;
    return { hash, url, filename, sys_url };
  }

  async getAnyFileFromS3(sysUrl: string, ext: string) {
    if (!sysUrl)
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    const file = await this.getImageCloudS3(`${sysUrl}${ext}`);
    return file;
  }

  private async putObject(
    fileContent: Buffer,
    key: string,
    extra?: {
      Metadata?: Record<string, string>;
    },
  ): Promise<UploadResult> {
    const stopS3Timer = this.monitoringService.startS3Timer('put_object');

    if (this.configService.get('REGION') === 'CHINA') {
    }

    const bucket = this.getBucketName();
    let response: PutObjectCommandOutput;

    try {
      response = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileContent,
          ...extra,
        }),
      );
    } catch (error) {
      stopS3Timer('failure');
      throw error;
    }

    stopS3Timer('success');
    return {
      ...response,
      Bucket: bucket,
      Key: key,
      Location: `https://${bucket}.s3.${this.configService.get<string>(
        'AWS_REGION',
      )}.amazonaws.com/${key}`,
    };
  }

  private getBucketName(): string {
    return this.configService.get<string>('AWS_BUCKET_NAME') ?? '';
  }

  private getHost(): string {
    const ssl = this.configService.get('SSL');
    const env = this.configService.get('ENV');
    const hostname = this.configService.get('HOSTNAME');
    const port = this.configService.get('PORT');

    if (ssl === 'false' && env === 'production') {
      return `https://${hostname}`;
    } else {
      return `${hostname}:${port}`;
    }
  }
}
