import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AwsS3Service } from 'src/common/awsS3/awsS3.service';
import { ErrorStatus } from 'src/common/constants/error-status';
import { ErrorExceptionFactory } from 'src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@ApiTags('Image')
@Controller('image')
export class ImageController {
  constructor(private readonly imageRead: AwsS3Service) {}

  @Get('*')
  async getproductById(@Param('0') key: string, @Req() req: Request, @Res() res: Response) {
    const imageKey = this.decodeImageKey(key || this.getImageKeyFromRequest(req));
    const image = await this.imageRead.getImagesFromCloud(imageKey);

    if (!image?.Body) {
      throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
    }

    const buffer = Buffer.from(image.Body as Buffer);
    const contentType = image.ContentType || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    res.status(200).send(buffer);
  }

  private getImageKeyFromRequest(req: Request): string {
    const marker = '/image/';
    const [, key = ''] = req.originalUrl.split(marker);

    return key.split('?')[0];
  }

  private decodeImageKey(key: string): string {
    try {
      return decodeURIComponent(key);
    } catch {
      return key;
    }
  }
}
