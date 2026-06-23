const DEFAULT_SENSITIVE_KEYS = new Set([
  'password',
  'new_password',
  'current_password',
  'token',
  'refresh_token',
  'confirm_token',
  'delete_token',
  'access_token',
  'id_token',
  'secret',
  'client_secret',
  'api_key',
  'email',
  'phone',
  'birth',
  'address',
  'push_token',
  'recovery_password_digest',
  'password_digest',
  'social_id',
  'confirm',
]);

const SENSITIVE_KEY_PATTERN = /(password|token|secret|email|phone|birth|address|push|recovery)/i;

function maskString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;

  if (trimmed.includes('@')) {
    const [name, domain] = trimmed.split('@');
    const maskedName = name.length <= 2 ? '*'.repeat(name.length) : `${name.slice(0, 2)}***`;
    return `${maskedName}@${domain}`;
  }

  if (trimmed.length <= 4) {
    return '*'.repeat(trimmed.length);
  }

  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
}

export function redactSensitiveValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return maskString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item));
  }

  if (typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(input)) {
      if (DEFAULT_SENSITIVE_KEYS.has(key) || SENSITIVE_KEY_PATTERN.test(key)) {
        output[key] = '***';
        continue;
      }

      output[key] = redactSensitiveValue(item);
    }

    return output;
  }

  return value;
}

export function redactRequestPath(path: string | undefined | null): string {
  if (!path) {
    return '-';
  }

  const [pathname] = path.split('?');
  return pathname || '-';
}
