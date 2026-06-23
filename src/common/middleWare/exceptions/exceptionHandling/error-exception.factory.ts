import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ErrorStatus } from '@/src/common/constants/error-status';
import {
  getEnglishErrorMessage,
  getLocalizedErrorMessage,
  normalizeTranslationLocale,
} from './error-translation.catalog';

type ExceptionKind =
  | 'badRequest'
  | 'conflict'
  | 'forbidden'
  | 'http'
  | 'internal'
  | 'notFound'
  | 'unauthorized'
  | 'unprocessable';

type ExceptionPayload = {
  result_code: number;
  error: string;
};

export class ErrorExceptionFactory {
  static create(kind: ExceptionKind, payload: ExceptionPayload, httpStatus?: number) {
    switch (kind) {
      case 'badRequest':
        return new BadRequestException(payload);
      case 'conflict':
        return new ConflictException(payload);
      case 'forbidden':
        return new ForbiddenException(payload);
      case 'http':
        return new HttpException(payload, httpStatus ?? payload.result_code);
      case 'notFound':
        return new NotFoundException(payload);
      case 'unauthorized':
        return new UnauthorizedException(payload);
      case 'unprocessable':
        return new UnprocessableEntityException({
          status: ErrorStatus.VALIDATION_ERROR,
          ...payload,
        });
      case 'internal':
      default:
        return new InternalServerErrorException(payload);
    }
  }

  static createFromStatus(
    kind: ExceptionKind,
    resultCode: number,
    httpStatus?: number,
    locale?: string,
  ) {
    const normalizedLocale = normalizeTranslationLocale(locale);
    const message =
      getLocalizedErrorMessage(normalizedLocale, resultCode) ||
      getEnglishErrorMessage(resultCode) ||
      String(resultCode);

    return this.create(
      kind,
      {
        result_code: resultCode,
        error: message,
      },
      httpStatus,
    );
  }
}
