import { Injectable, Logger } from '@nestjs/common';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class JusoService {
  private readonly logger = new Logger(JusoService.name);

  async fetchJuso(keyword: string): Promise<any[]> {
    const isKorean = /[ㄱ-ㅎ|가-힣]/.test(keyword);

    return isKorean
      ? await this.searchKoreanAddress(keyword)
      : await this.searchForeignAddress(keyword);
  }

  private async searchKoreanAddress(keyword: string): Promise<any[]> {
    const apiKey = process.env.JUSO_API_KEY;
    if (!apiKey) {
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }

    const url = new URL('https://www.juso.go.kr/addrlink/addrLinkApi.do');
    url.searchParams.append('currentPage', '1');
    url.searchParams.append('countPerPage', '5');
    url.searchParams.append('keyword', keyword);
    url.searchParams.append('confmKey', apiKey);
    url.searchParams.append('resultType', 'json');

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
      }

      const json = await response.json();

      return (
        json?.results?.juso?.map((item: any) => ({
          roadAddr: item.roadAddr,
          zipNo: item.zipNo,
          siNm: item.siNm,
          sggNm: item.sggNm,
        })) || []
      );
    } catch (error) {
      this.logger.error(
        `Korean address API error: ${error instanceof Error ? error.message : error}`,
      );
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }

  private async searchForeignAddress(keyword: string): Promise<any[]> {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }

    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    url.searchParams.append('text', keyword);
    url.searchParams.append('apiKey', apiKey);

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
      }

      const json = await response.json();

      return (
        json?.features?.map((item: any) => ({
          roadAddr: item.properties.formatted,
          zipNo: item.properties.postcode,
          siNm: item.properties.city,
        })) || []
      );
    } catch (error) {
      this.logger.error(
        `Foreign address API error: ${error instanceof Error ? error.message : error}`,
      );
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }
}
