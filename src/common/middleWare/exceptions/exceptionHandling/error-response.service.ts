import { Injectable } from '@nestjs/common';
import {
  getEnglishErrorMessage,
  getLocalizedErrorMessage,
  normalizeTranslationLocale,
} from './error-translation.catalog';

@Injectable()
export class ErrorResponseService {
  private readonly supportedLanguages = [
    'ar',
    'cs',
    'de',
    'el',
    'en',
    'es',
    'et',
    'fa',
    'fr',
    'he',
    'hu',
    'id',
    'it',
    'ja',
    'ko',
    'lt',
    'nl',
    'no',
    'pl',
    'pt',
    'pt-br',
    'ru',
    'sk',
    'th',
    'tr',
    'vi',
    'zh-Hans',
    'zh-Hant',
  ] as const;

  normalizeLanguage(language: string | undefined): string {
    const candidateLang = normalizeTranslationLocale(language);

    return (
      this.supportedLanguages.find((lang) => lang.toLowerCase() === candidateLang.toLowerCase()) ??
      'en'
    );
  }

  resolveMessage(language: string, status: number): string {
    return getLocalizedErrorMessage(language, status) || getEnglishErrorMessage(status) || String(status);
  }
}
