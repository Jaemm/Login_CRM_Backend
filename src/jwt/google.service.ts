import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { SocialInterface } from './interfaces/token.interface';
import { LoginSocialDto } from '../modules/consultants/consultants.dto';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { ErrorStatus } from '@/src/common/constants/error-status';

@Injectable()
export class AuthGoogleService {
  private readonly googleClient: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(clientId);
  }

  async getProfileByToken(loginDto: LoginSocialDto): Promise<SocialInterface> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');

    const ticket = await this.googleClient.verifyIdToken({
      idToken: loginDto.tokenId,
      audience: clientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw ErrorExceptionFactory.createFromStatus(
        'unauthorized',
        ErrorStatus.INVALID_ACCESS_TOKEN,
      );
    }

    const { sub, email, given_name, family_name } = payload;

    return {
      id: sub,
      email,
      firstName: given_name,
      lastName: family_name,
    };
  }
}
