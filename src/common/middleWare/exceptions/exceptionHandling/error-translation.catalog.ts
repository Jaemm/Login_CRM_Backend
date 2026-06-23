import * as fs from 'fs';
import * as path from 'path';

type ErrorTranslationItem = {
  term: string;
  definition: string;
};

export function normalizeTranslationLocale(languageCode: string | undefined): string {
  const normalized = (languageCode || 'en').trim();
  if (!normalized) return 'en';

  const lower = normalized.toLowerCase();

  if (lower === 'pt-br' || lower.startsWith('pt-br')) {
    return 'pt-br';
  }

  if (lower.startsWith('pt')) {
    return 'pt';
  }

  if (lower.startsWith('zh')) {
    if (lower.includes('hant') || lower.includes('tw')) {
      return 'zh-Hant';
    }

    return 'zh-Hans';
  }

  const [baseLanguage] = normalized.split(/[-_]/);
  return baseLanguage || 'en';
}

const errorTranslationBase = path.join(
  process.cwd(),
  'src',
  'common',
  'translation',
  'errorTranslationPoeditor',
);

const errorTranslationCache = new Map<string, Array<ErrorTranslationItem>>();
const englishMessageCache = new Map<number, string>();

function loadTranslations(languageCode: string): Array<ErrorTranslationItem> {
  const cached = errorTranslationCache.get(languageCode);
  if (cached) {
    return cached;
  }

  const file = fs.existsSync(path.join(errorTranslationBase, `${languageCode}.json`))
    ? path.join(errorTranslationBase, `${languageCode}.json`)
    : path.join(errorTranslationBase, 'en.json');

  const translation = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<ErrorTranslationItem>;
  errorTranslationCache.set(languageCode, translation);
  return translation;
}

export function getLocalizedErrorMessage(languageCode: string, status: number): string | undefined {
  const translation = loadTranslations(normalizeTranslationLocale(languageCode));
  const english = loadTranslations('en');
  const term = `error_msg_${status}`;

  return (
    translation.find((item) => item.term === term)?.definition?.trim()?.replace(/[\n\t]/g, '') ||
    english.find((item) => item.term === term)?.definition?.trim()?.replace(/[\n\t]/g, '')
  );
}

export function getEnglishErrorMessage(status: number): string | undefined {
  const cached = englishMessageCache.get(status);
  if (cached) {
    return cached;
  }

  const message = getLocalizedErrorMessage('en', status);
  if (message) {
    englishMessageCache.set(status, message);
  }

  return message;
}
