import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { ErrorStatus } from '../../constants/error-status';
import { ErrorExceptionFactory } from '../exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor() {}

  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly accessSecretKey = process.env.CRM_ACCESS_TOKEN_SECRET;
  private readonly refreshSecretKey = process.env.JWT_REFRESH_TOKEN_SECRET;

  use(req: Request, res: Response, next: NextFunction) {
    const { token, source } = this.extractToken(req);

    if (!token) {
      this.logMissingToken(req);
      throw this.createException(ErrorStatus.MISSING_ACCESS_TOKEN);
    }

    try {
      const decoded = this.verifyPrimaryToken(req, token);
      req['user'] = decoded;
      next();
    } catch (err) {
      this.logVerificationFailure(req, source, token, err);
      const resultCode = this.getResultCodeFromJwtError(err);
      throw this.createException(resultCode);
    }
  }

  private extractToken(req: Request): { token?: string; source?: string } {
    const candidates = [
      { source: 'x-chowis-consultant-token', value: req.headers['x-chowis-consultant-token'] },
      { source: 'x-chowis-token', value: req.headers['x-chowis-token'] },
      { source: 'authorization', value: req.headers.authorization },
    ];

    for (const candidate of candidates) {
      const token = this.normalizeToken(candidate.value);
      if (token) {
        return { token, source: candidate.source };
      }
    }

    return {};
  }

  private verifyPrimaryToken(req: Request, token: string): string | jwt.JwtPayload {
    try {
      return jwt.verify(token, this.accessSecretKey);
    } catch (error) {
      const refreshDecoded = this.tryVerifyRefreshTokenFallback(req, token, error);
      if (refreshDecoded) {
        return refreshDecoded;
      }
      throw error;
    }
  }

  // Temporary compatibility path: some clients send refresh tokens to protected APIs.
  // Keep the fallback centralized here so we can delete it in one place after app rollout.
  private tryVerifyRefreshTokenFallback(
    req: Request,
    token: string,
    originalError: any,
  ): string | jwt.JwtPayload | undefined {
    if (originalError?.name !== 'JsonWebTokenError' || !this.refreshSecretKey) {
      return undefined;
    }

    try {
      const decoded = jwt.verify(token, this.refreshSecretKey);
      this.logger.warn(
        JSON.stringify({
          message: 'Refresh token accepted temporarily for protected API request',
          method: req.method,
          path: req.originalUrl || req.url,
          user_agent: req.headers['user-agent'],
          ip: req.ip,
        }),
      );
      return decoded;
    } catch {
      return undefined;
    }
  }

  private normalizeToken(value: string | string[] | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const rawValue = Array.isArray(value) ? value[0] : value;
    const trimmedValue = rawValue?.trim();

    if (!trimmedValue) {
      return undefined;
    }

    if (trimmedValue === 'null' || trimmedValue === 'undefined') {
      return undefined;
    }

    const withoutBearer = trimmedValue.replace(/^Bearer\s+/i, '').trim();
    const unquotedValue = withoutBearer.replace(/^['"]|['"]$/g, '').trim();

    return unquotedValue || undefined;
  }

  private getResultCodeFromJwtError(error: any): number {
    switch (error.name) {
      case 'TokenExpiredError':
        return ErrorStatus.ACCESS_TOKEN_TIME_OUT;
      case 'JsonWebTokenError':
        return ErrorStatus.INVALID_ACCESS_TOKEN;
      case 'NotBeforeError':
        return ErrorStatus.UNAUTHORIZED;
      default:
        return ErrorStatus.UNAUTHORIZED;
    }
  }

  private logMissingToken(req: Request): void {
    this.logger.warn(
      JSON.stringify({
        message: 'Auth token missing',
        method: req.method,
        path: req.originalUrl || req.url,
        headers_present: this.getPresentAuthHeaders(req),
        user_agent: req.headers['user-agent'],
        ip: req.ip,
      }),
    );
  }

  private logVerificationFailure(
    req: Request,
    source: string | undefined,
    token: string,
    error: any,
  ): void {
    this.logger.warn(
      JSON.stringify({
        message: 'Auth token verification failed',
        method: req.method,
        path: req.originalUrl || req.url,
        token_source: source ?? 'unknown',
        token_preview: this.getTokenPreview(token),
        token_length: token.length,
        jwt_error_name: error?.name ?? 'UnknownError',
        jwt_error_message: error?.message ?? 'Unknown error',
        headers_present: this.getPresentAuthHeaders(req),
        user_agent: req.headers['user-agent'],
        ip: req.ip,
      }),
    );
  }

  private getPresentAuthHeaders(req: Request): string[] {
    const headers: Array<[string, string | string[] | undefined]> = [
      ['x-chowis-consultant-token', req.headers['x-chowis-consultant-token']],
      ['x-chowis-token', req.headers['x-chowis-token']],
      ['authorization', req.headers.authorization],
    ];

    return headers.filter(([, value]) => this.normalizeToken(value)).map(([name]) => name);
  }

  private getTokenPreview(token: string): string {
    if (token.length <= 10) {
      return 'redacted';
    }

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  private createException(resultCode: number) {
    return ErrorExceptionFactory.createFromStatus('unauthorized', resultCode);
  }
}
