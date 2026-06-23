import { ConsoleLogger, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getClientIp } from '@/src/common/utils/request-client-ip';
import { redactRequestPath, redactSensitiveValue } from '@/src/common/utils/privacy-redaction';

class NoTimestampConsoleLogger extends ConsoleLogger {
  protected formatMessage(
    logLevel: 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal',
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    const output = this.stringifyMessage(message, logLevel);
    pidMessage = this.colorize(pidMessage, logLevel);
    formattedLogLevel = this.colorize(formattedLogLevel, logLevel);
    return `${pidMessage}${formattedLogLevel} ${contextMessage}${output}${timestampDiff}\n`;
  }
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new NoTimestampConsoleLogger(LoggingMiddleware.name);
  private readonly skippedPathPrefixes = [
    '/metrics',
    '/health',
    '/docs',
    '/docs-md',
    '/docs-json',
    '/favicon.ico',
  ];

  private isErrorStatus(statusCode: number): boolean {
    return statusCode >= 400;
  }

  private shouldSkipLogging(req: Request, statusCode: number): boolean {
    if (this.isErrorStatus(statusCode)) {
      return true;
    }

    if (req.method === 'OPTIONS') {
      return true;
    }

    const path = req.path || req.originalUrl || '';
    return this.skippedPathPrefixes.some((prefix) => path.startsWith(prefix));
  }

  private maskBody(body: any) {
    return redactSensitiveValue(body);
  }

  private extractLocale(req: Request) {
    const raw =
      req.headers['x-local'] ||
      req.headers['x-locale'] ||
      req.headers['x-chowis-locale'] ||
      req.headers['x-chowis-consultant-locale'];

    if (!raw) return { raw: undefined, normalized: undefined };

    const value = Array.isArray(raw) ? raw[0] : raw;

    return {
      raw: value,
      normalized: value.toLowerCase(),
    };
  }

  private extractRequestId(req: Request): string | undefined {
    const requestId = req.headers['x-request-id'];
    const value = Array.isArray(requestId) ? requestId[0] : requestId;

    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    const { method, originalUrl } = req;
    const ip = getClientIp(req);
    const userAgent = req.get('user-agent') || '';

    const locale = this.extractLocale(req);
    const requestId = this.extractRequestId(req);

    res.on('finish', () => {
      const duration = Date.now() - start;

      if (this.shouldSkipLogging(req, res.statusCode)) {
        return;
      }

      const logPayload: Record<string, unknown> = {
        method,
        path: redactRequestPath(originalUrl),
        status: res.statusCode,
        requestId,
        durationMs: duration,
        ip: ip || '-',
        locale: locale.normalized ?? '-',
        userAgent: userAgent || '-',
      };

      if (req.body && Object.keys(req.body).length) {
        logPayload.body = this.maskBody(req.body);
      }

      const log = this.isErrorStatus(res.statusCode)
        ? this.logger.error.bind(this.logger)
        : this.logger.log.bind(this.logger);

      log(JSON.stringify(logPayload));
    });

    next();
  }
}
