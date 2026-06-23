import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisCompleteService } from './analysisComplete.service';
import { AnalysisCompleteController } from './analysisComplete.controller';
import { AnalysisWebhookController } from './analysisWebhook.controller';
import { AnalysisWebhookService } from './analysisWebhook.service';
import { AnalysisQueryController } from './analysis-query.controller';
import { AnalysisQueryService } from './analysis-query.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([], 'cndpHairDB'),
    TypeOrmModule.forFeature([], 'cndpSkinDB'),
    TypeOrmModule.forFeature([], 'cmaHairDB'),
    TypeOrmModule.forFeature([], 'cmaSkinDB'),
    TypeOrmModule.forFeature([]),
  ],
  controllers: [AnalysisCompleteController, AnalysisWebhookController, AnalysisQueryController],
  providers: [AnalysisCompleteService, AnalysisWebhookService, AnalysisQueryService],
})
export class AnalysisEventsModule {}
