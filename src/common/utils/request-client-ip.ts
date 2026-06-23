import { Request } from 'express';

function normalizeIp(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/^::ffff:/, '');
}

export function getClientIp(request: Request): string | undefined {
  const forwardedIps = Array.isArray(request.ips) ? request.ips : [];
  const trustedProxyIp = normalizeIp(forwardedIps[0]);
  if (trustedProxyIp) {
    return trustedProxyIp;
  }

  const requestIp = normalizeIp(request.ip);
  if (requestIp) {
    return requestIp;
  }

  return normalizeIp(request.socket?.remoteAddress);
}

export function getForwardedFor(request: Request): string | undefined {
  const header = request.headers['x-forwarded-for'];
  const value = Array.isArray(header) ? header[0] : header;

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
