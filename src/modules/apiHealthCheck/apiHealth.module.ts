import { Module } from '@nestjs/common';
import { HealthController } from './apiHealth.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
