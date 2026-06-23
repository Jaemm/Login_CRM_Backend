import { Global, Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { PrometheusInterceptor } from 'src/common/interceptors/prometheus.interceptor';
import { MonitoringService } from './monitoring.service';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [PrometheusInterceptor, MonitoringService],
  exports: [PrometheusModule, PrometheusInterceptor, MonitoringService],
})
export class MonitoringModule {}
