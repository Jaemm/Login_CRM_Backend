import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Jwt from 'jsonwebtoken';

import { CommonService } from 'src/common/common.service';
import { IJwt } from 'src/config/interfaces/jwt.interfaces';
import { TokenTypeEnum } from './enums/auth-token.enum';
import { IAccessToken } from './interfaces/access-token.interface';
import { IRefreshToken } from './interfaces/refresh-token.interface';
import { IEmailToken } from './interfaces/email-token.interface';
import { ErrorStatus } from '../common/constants/error-status';
import { ErrorExceptionFactory } from 'src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class JwtService {
  private readonly jwtConfig: IJwt;
  private readonly issuer: string;
  private readonly domain: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly commonService: CommonService,
  ) {
    this.jwtConfig = this.configService.get<IJwt>('jwt');
    this.issuer = this.configService.get<string>('APP_ID');
    this.domain = this.configService.get<string>('DOMAIN');
  }

  private async generateRS256Token(
    payload: any,
    privateKey: string,
    jwtOptions: Jwt.SignOptions,
    expiresIn: number,
  ): Promise<string> {
    return this.commonService.throwDuplicateError(
      JwtService.generateTokenAsync(payload, privateKey, {
        ...jwtOptions,
        expiresIn,
        algorithm: 'RS256',
      }),
    );
  }

  private static async generateTokenAsync(
    payload: string | object | Buffer,
    secret: string,
    options: Jwt.SignOptions,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      Jwt.sign(payload, secret, options, (error, token) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(token as string);
      });
    });
  }

  private static async verifyTokenAsync<T>(
    token: string,
    secret: string,
    options: Jwt.VerifyOptions,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      Jwt.verify(token, secret, options, (error, payload: T) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(payload);
      });
    });
  }

  public async generateToken(
    user: any,
    tokenType: TokenTypeEnum,
    domain: string | null,
    tokenId?: string,
  ): Promise<string> {
    const jwtOptions: Jwt.SignOptions = {
      issuer: this.issuer,
      subject: user.email,
      audience: domain ?? this.domain,
      algorithm: 'HS256',
    };

    const basePayload = {
      id: user?.id?.toString() ?? '',
      role: user.role,
      is_hair_skin: user.is_hair_skin,
      app_id: user.app_id,
    };

    let secret: string;
    let expiresIn: number;
    const payload: any = { ...basePayload };

    switch (tokenType) {
      case TokenTypeEnum.ACCESS:
        ({ secret, time: expiresIn } = this.jwtConfig.access);
        break;
      case TokenTypeEnum.REFRESH:
        ({ secret, time: expiresIn } = this.jwtConfig.refresh);
        payload.tokenId = tokenId ?? uuidv4();
        break;
      case TokenTypeEnum.CONFIRMATION:
      case TokenTypeEnum.RESET_PASSWORD:
        ({ secret, time: expiresIn } = this.jwtConfig[tokenType]);
        break;
      default:
        throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }

    const tokenPromise = JwtService.generateTokenAsync(payload, secret, {
      ...jwtOptions,
      expiresIn,
    });

    const token =
      tokenType === TokenTypeEnum.ACCESS
        ? await this.commonService.throwDuplicateError(tokenPromise)
        : await this.commonService.throwInternalError(tokenPromise);

    return token;
  }

  public async verifyToken<T extends IAccessToken | IRefreshToken | IEmailToken>(
    token: string,
    tokenType: TokenTypeEnum,
  ): Promise<T> {
    const jwtOptions: Jwt.VerifyOptions = {
      issuer: this.issuer,
      audience: new RegExp(this.domain),
    };

    const { secret, time } = this.jwtConfig[tokenType];

    return JwtService.throwBadRequest(
      JwtService.verifyTokenAsync<T>(token, secret, {
        ...jwtOptions,
        maxAge: time,
      }),
    );
  }

  private static async throwBadRequest<T extends IAccessToken | IRefreshToken | IEmailToken>(
    promise: Promise<T>,
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      if (error instanceof Jwt.TokenExpiredError) {
        throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
      }
      if (error instanceof Jwt.JsonWebTokenError) {
        throw ErrorExceptionFactory.createFromStatus('unauthorized', ErrorStatus.UNAUTHORIZED);
      }
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }

  public getTokenFromRequest(req: Request): string | undefined {
    const candidates = [
      req.headers['x-chowis-consultant-token'],
      req.headers['x-chowis-token'],
      req.headers.authorization,
    ];

    for (const candidate of candidates) {
      const token = this.normalizeToken(candidate);
      if (token) {
        return token;
      }
    }

    return undefined;
  }

  private normalizeToken(value: string | string[] | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const rawValue = Array.isArray(value) ? value[0] : value;
    const trimmedValue = rawValue?.trim();

    if (!trimmedValue || trimmedValue === 'null' || trimmedValue === 'undefined') {
      return undefined;
    }

    const withoutBearer = trimmedValue.replace(/^Bearer\s+/i, '').trim();
    const unquotedValue = withoutBearer.replace(/^['"]|['"]$/g, '').trim();

    return unquotedValue || undefined;
  }
}
