import { Module } from '@nestjs/common';
import { JusoController } from './juso.controller';
import { JusoService } from './juso.service';

@Module({
  controllers: [JusoController],
  providers: [JusoService],
})
export class JusoModule {}
