import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandCustomizationsController } from './brandCustomizations.controller';
import { BrandCustomizationsService } from './brandCustomizations.service';

@Module({
  imports: [TypeOrmModule.forFeature([], 'globalDB')],
  controllers: [BrandCustomizationsController],
  providers: [BrandCustomizationsService],
})
export class BrandCustomizationsModule {}
