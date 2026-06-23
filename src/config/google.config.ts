import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../common/utils/validate-config';
import { GoogleConfig } from './type/google-config.type';

class GoogleEnvValidator {
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID!: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET!: string;
}

export default registerAs<GoogleConfig>('google', () => {
  validateConfig(process.env, GoogleEnvValidator);

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
  };
});
