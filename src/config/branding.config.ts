export interface BrandConfig {
  ids: number[];
  logos: Record<number | string, string>;
  emailProvider: 'classtech' | 'oauth' | 'outlook' | 'alfaparf' | 'choicetech' | 'sukoshi';
  contact?: {
    address?: string;
    email?: string;
    phone?: string;
  };
  senderEmail?: string;
  displayName?: string;
  omitSenderDisplayName?: boolean;
  omitSubjectBrandName?: boolean;
}

export const CHOWIS_EMAIL_APP_NAMES = [
  'dermobella',
  'dermopico',
  'dermofain',
  'dermohome',
  'dermochoice',
];

export const CHOWIS_EMAIL_APP_IDS = [44, 53, 40, 41];

export const BRAND_CONFIG: Record<string, BrandConfig> = {
  alfaparf: {
    ids: [302, 303, 304, 305],
    logos: {
      302: 'https://example.com/image/becos-logo.png',
      303: 'https://example.com/image/dibi-logo.png',
      304: 'https://example.com/image/olos-logo.png',
      305: 'https://example.com/image/ten-logo.png',
    },
    emailProvider: 'alfaparf',
    contact: {
      address: '-',
      email: '-',
      phone: '-',
    },
    senderEmail: 'no-reply@example.com',
    displayName: 'Alfaparf',
    omitSenderDisplayName: true,
    omitSubjectBrandName: true,
  },
  classtech: {
    ids: [317],
    logos: {
      317: 'https://example.com/image/classtech-logo.png',
    },
    emailProvider: 'classtech',
    contact: {
      address: 'Example address, City, Country',
      email: 'contact@example.com',
      phone: '-',
    },
    senderEmail: 'no-reply@example.com',
    displayName: 'ClassTech',
  },
  sukoshi: {
    ids: [324],
    logos: {
      324: 'https://example.com/image/sukoshi-logo.png',
    },
    emailProvider: 'sukoshi',
    contact: {
      address: 'Example address, City, Country',
      email: 'contact@example.com',
      phone: '-',
    },
    senderEmail: 'no-reply@example.com',
    displayName: 'Sukoshi',
  },
  choicetech: {
    ids: [323],
    logos: {
      default: 'https://example.com/image/ctk-logo.png',
    },
    emailProvider: 'choicetech',
    contact: {
      address: 'Example address, City, Country',
      email: 'contact@example.com',
      phone: '+00-00-0000-0000',
    },
    senderEmail: 'no-reply@example.com',
    displayName: 'ChoiceTech',
  },
  Chowis: {
    ids: [1],
    logos: {
      default: 'https://example.com/image/chowis-logo.png',
    },
    emailProvider: 'outlook',
    contact: {
      address: 'Example address, City, Country',
      email: 'contact@example.com',
      phone: '+00-00-0000-0000',
    },
    senderEmail: 'no-reply@example.com',
    displayName: 'Chowis',
  },
  outlook: {
    ids: [],
    logos: {
      default: 'https://example.com/image/chowis-logo.png',
    },
    emailProvider: 'outlook',
    contact: {
      address: 'Example address, City, Country',
      email: 'contact@example.com',
      phone: '+00-00-0000-0000',
    },
    senderEmail: 'no-reply@example.com',
    displayName: 'Chowis',
  },
};

export function normalizeEmailAppName(appName?: string | null): string | null {
  const normalized = appName?.trim().toLowerCase();
  return normalized || null;
}

export function isChowisEmailApp(input?: {
  appId?: number | string | null;
  appName?: string | null;
}): boolean {
  const numericAppId = Number(input?.appId);
  if (Number.isFinite(numericAppId) && CHOWIS_EMAIL_APP_IDS.includes(numericAppId)) {
    return true;
  }

  const normalizedAppName = normalizeEmailAppName(input?.appName);
  return normalizedAppName ? CHOWIS_EMAIL_APP_NAMES.includes(normalizedAppName) : false;
}

export function resolveEmailBrandConfig(input?: {
  consultantCompanyId?: number | string | null;
  appId?: number | string | null;
  appName?: string | null;
  company?: string | null;
  emailProvider?: string | null;
  fallbackKey?: keyof typeof BRAND_CONFIG;
}): BrandConfig {
  if (isChowisEmailApp({ appId: input?.appId, appName: input?.appName })) {
    return BRAND_CONFIG.outlook;
  }

  const fallbackKey = input?.fallbackKey ?? 'choicetech';
  const fallback = BRAND_CONFIG[fallbackKey] ?? BRAND_CONFIG.choicetech;

  if (input?.emailProvider && BRAND_CONFIG[input.emailProvider]) {
    return BRAND_CONFIG[input.emailProvider];
  }

  if (input?.consultantCompanyId !== undefined && input?.consultantCompanyId !== null) {
    const companyId = Number(input.consultantCompanyId);
    const match = Object.values(BRAND_CONFIG).find((brand) => brand.ids.includes(companyId));
    if (match) {
      return match;
    }
  }

  if (input?.company) {
    const normalizedCompany = input.company.toLowerCase();

    if (normalizedCompany === 'choicetech') {
      return BRAND_CONFIG.choicetech;
    }

    if (BRAND_CONFIG[normalizedCompany]) {
      return BRAND_CONFIG[normalizedCompany];
    }

    const oauthCompanies =
      process.env.OAUTH_COMPANIES?.split(',').map((value) => value.trim().toLowerCase()) ?? [];

    if (oauthCompanies.includes(normalizedCompany)) {
      return BRAND_CONFIG.alfaparf;
    }
  }

  return fallback;
}
