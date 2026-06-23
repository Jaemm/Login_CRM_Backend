import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';

import { JwtService } from 'src/jwt/jwt.service';

@Module({
  imports: [],
  providers: [AuthService, JwtService],
  exports: [AuthService, JwtService],
})
export class AuthModule {}
