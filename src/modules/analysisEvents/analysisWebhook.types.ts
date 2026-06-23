export type AnalysisWebhookMode = 'process' | 'validate';

export type WebhookIssueSeverity = 'error' | 'warning';

export type WebhookIssueCode =
  | 'SOURCE_MISSING'
  | 'SOURCE_NOT_ALLOWED'
  | 'BATCH_ID_MISSING'
  | 'ANALYSIS_DB_MISSING'
  | 'CUSTOMER_MISSING'
  | 'MEASUREMENTS_MISSING'
  | 'MEASUREMENT_GROUP_INVALID'
  | 'MEASUREMENT_VALUE_INVALID';

export type WebhookValidationIssue = {
  code: WebhookIssueCode;
  severity: WebhookIssueSeverity;
  path: string;
  message: string;
};

export type WebhookValidationSummary = {
  batch_id: number | null;
  analysis_db: string | null;
  source: string | null;
  group_count: number;
  total_measurements: number;
};

export type AnalysisWebhookValidationResult = {
  valid: boolean;
  mode: AnalysisWebhookMode;
  source: string | null;
  allowed_source: boolean;
  summary: WebhookValidationSummary;
  issues: WebhookValidationIssue[];
};

export type AnalysisWebhookResponse = {
  status: 'ok' | 'validated';
  validation: AnalysisWebhookValidationResult;
};
