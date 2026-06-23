import { Injectable } from '@nestjs/common';
import { CommonService } from 'src/common/common.service';
import { TokenTypeEnum } from 'src/jwt/enums/auth-token.enum';
import { JwtService } from 'src/jwt/jwt.service';
import { ErrorStatus } from 'src/common/constants/error-status';

import { IAuthResult } from './auth-result.interface';
import { IRefreshToken } from 'src/jwt/interfaces/refresh-token.interface';

import * as crypto from 'crypto';
import * as Jwt from 'jsonwebtoken';
import { ErrorExceptionFactory } from 'src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService, private readonly common: CommonService) {}

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
    return value;
  }

  async generateAuthTokens(
    user: any,
    domain?: string,
    tokenId?: string,
  ): Promise<[string, string]> {
    return Promise.all([
      this.jwtService.generateToken(user, TokenTypeEnum.ACCESS, domain, tokenId),
      this.jwtService.generateToken(user, TokenTypeEnum.REFRESH, domain, tokenId),
    ]);
  }

  async refreshTokenAccess(user: any, refreshToken: string, domain: string): Promise<IAuthResult> {
    const { tokenId } = await this.jwtService.verifyToken<IRefreshToken>(
      refreshToken,
      TokenTypeEnum.REFRESH,
    );
    const [accessToken, newRefreshToken] = await this.generateAuthTokens(user, domain, tokenId);

    return { accessToken, refreshToken: newRefreshToken, user };
  }

  generateRandomToken(length = 32): string {
    return crypto.randomBytes(length / 2).toString('hex');
  }

  isTokenExpired(token: string): boolean {
    try {
      Jwt.verify(token, this.getRequiredEnv('CRM_ACCESS_TOKEN_SECRET'));
      return false;
    } catch (err) {
      return err.name === 'TokenExpiredError';
    }
  }
}
