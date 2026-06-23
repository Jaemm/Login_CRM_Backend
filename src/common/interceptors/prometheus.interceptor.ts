import { createPrometheusHttpInterceptor } from '@chowis/observability';

export class PrometheusInterceptor extends createPrometheusHttpInterceptor({
  inflightMetricName: 'login_crm_http_requests_in_flight',
}) {}
