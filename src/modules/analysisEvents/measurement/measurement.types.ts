export type SkinConditionValue = {
  skinAge: number | null;
  skinCondition: string | null;
};

export type MeasurementValue =
  | {
      nth_analysis: string;
      raw: number | null;
      score: number | null;
      computation_score: number | null;
      keyword?: string | null;
      originalImage: string | null;
      analysisImage: string | null;
    }
  | SkinConditionValue;

export type MeasurementGroupPayload = {
  type_measurement_id: number;
  type_measurement_name?: string | null;
  measurements: MeasurementValue[];
};

export type CustomerSyncPayload = {
  customer_id: number;
  name: string | null;
  surname: string | null;
  phone: string | null;
  birth: string | null;
  country_id: number | null;
  email: string | null;
};

export type BatchSyncPayload = {
  batch_id: number;
  analysis_db: string;
  customer: CustomerSyncPayload;
  measurements: MeasurementGroupPayload[];
};

export type CollectorAnalysisCompleteRequest = {
  batch_id?: number | string;
  customer_id?: number | string | null;
  consultant_id?: number | string | null;
  app_id?: number | string | null;
  analysis_type?: string | null;
};

export type CollectorWebResultPayload = {
  batch_id: number | string;
  customer_id?: number | string | null;
  consultant_id?: number | string | null;
  app_id?: number | string | null;
  analysis_type?: string | null;
  analysis_comment: string | null;
  image_urls: string[];
  results: Record<string, unknown>;
};

export type CollectorBatchSyncPayload = BatchSyncPayload & {
  source: 'COLLECTOR';
  collector: {
    analysis_type: string | null;
    app_id: number | string | null;
    image_urls: string[];
    results: Record<string, unknown>;
    analysis_comment: string | null;
  };
};
