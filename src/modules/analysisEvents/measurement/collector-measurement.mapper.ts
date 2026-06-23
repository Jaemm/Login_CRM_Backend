import { CollectorWebResultPayload, MeasurementGroupPayload } from './measurement.types';

export class CollectorMeasurementMapper {
  map(collectorResult: CollectorWebResultPayload): MeasurementGroupPayload[] {
    const results = this.toRecord(collectorResult.results);
    const imageUrls = Array.isArray(collectorResult.image_urls) ? collectorResult.image_urls : [];
    const groups: MeasurementGroupPayload[] = [];
    const skinConditionValue = this.mapSkinCondition(results);

    for (const [key, entries] of Object.entries(results)) {
      const definition = this.resolveDefinition(key);

      if (!definition || definition.kind !== 'score') {
        continue;
      }

      const measurement = this.mapScoreMeasurement(entries, imageUrls);

      if (!measurement) {
        continue;
      }

      groups.push({
        type_measurement_id: definition.type_measurement_id,
        type_measurement_name: definition.type_measurement_name,
        measurements: [measurement],
      });
    }

    if (skinConditionValue) {
      groups.push({
        type_measurement_id: 18,
        type_measurement_name: 'skinCondition',
        measurements: [skinConditionValue],
      });
    }

    return groups;
  }

  private resolveDefinition(key: string):
    | {
        kind: 'score';
        type_measurement_id: number;
        type_measurement_name: string;
      }
    | { kind: 'skinCondition' }
    | null {
    const normalized = key.toLowerCase();

    if (normalized.includes('skin_wrinkles')) {
      return { kind: 'score', type_measurement_id: 4, type_measurement_name: 'wrinkles' };
    }

    if (normalized.includes('skin_spots')) {
      return { kind: 'score', type_measurement_id: 8, type_measurement_name: 'spots' };
    }

    if (normalized.includes('skin_sensitivity')) {
      return { kind: 'score', type_measurement_id: 7, type_measurement_name: 'sensitivity' };
    }

    if (normalized.includes('skin_pores')) {
      return { kind: 'score', type_measurement_id: 1, type_measurement_name: 'pores' };
    }

    if (normalized.includes('skin_keratin')) {
      return { kind: 'score', type_measurement_id: 11, type_measurement_name: 'keratin' };
    }

    if (normalized.includes('skin_impurities')) {
      return { kind: 'score', type_measurement_id: 3, type_measurement_name: 'impurities' };
    }

    if (normalized.includes('skin_health')) {
      return { kind: 'score', type_measurement_id: 9, type_measurement_name: 'health_score' };
    }

    if (normalized.includes('skin_age') || normalized.includes('skin_condition')) {
      return { kind: 'skinCondition' };
    }

    return null;
  }

  private mapScoreMeasurement(entries: unknown, imageUrls: string[]) {
    const measurementData = this.firstMeasurementData(entries);
    const originalResults =
      this.toArray(measurementData?.original_image_results) ||
      this.toArray(measurementData?.original_results) ||
      this.toArray(measurementData?.original_hydration_results) ||
      this.toArray(measurementData?.original_sebum_results);
    const summary = this.findStatisticalSummary(originalResults);
    const score = this.resolveScore(originalResults, summary);
    const imageId = this.findImageId(originalResults);

    if (score === null && !summary) {
      return null;
    }

    return {
      nth_analysis: 'original',
      raw: score,
      score,
      computation_score: toNumberOrNull(summary?.average_computed_score) ?? score,
      keyword: summary?.keyword ?? null,
      originalImage: imageId ? this.findImageUrl(imageUrls, imageId) : null,
      analysisImage: null as string | null,
    };
  }

  private mapSkinCondition(results: Record<string, unknown>) {
    let skinAge: number | null = null;
    let skinCondition: string | null = null;

    for (const [key, entries] of Object.entries(results)) {
      const normalized = key.toLowerCase();
      const measurementData = this.firstMeasurementData(entries);

      if (normalized.includes('skin_age')) {
        const originalResults = this.toArray(measurementData?.original_results);
        skinAge =
          toNumberOrNull(originalResults?.[0]?.skin_age) ??
          toNumberOrNull(measurementData?.metadata?.biological_age) ??
          skinAge;
      }

      if (normalized.includes('skin_condition')) {
        const originalSkinCondition = this.toArray(measurementData?.original_skin_condition);
        skinCondition = originalSkinCondition?.[0]?.['skin-condition'] ?? skinCondition;
      }
    }

    if (skinAge === null && skinCondition === null) {
      return null;
    }

    return {
      skinAge,
      skinCondition,
    };
  }

  private firstMeasurementData(entries: unknown): any {
    if (!Array.isArray(entries)) {
      return null;
    }

    return entries.find((entry) => entry?.measurement_data)?.measurement_data ?? null;
  }

  private toArray(value: unknown): any[] | null {
    return Array.isArray(value) ? value : null;
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private findStatisticalSummary(results: any[] | null): any {
    return results?.find((item) => item?.statistical_summary)?.statistical_summary ?? null;
  }

  private resolveScore(results: any[] | null, summary: any): number | null {
    const firstScore = results?.find((item) => toNumberOrNull(item?.score) !== null)?.score;

    return (
      toNumberOrNull(summary?.average_computed_score) ??
      toNumberOrNull(firstScore) ??
      toNumberOrNull(results?.[0]?.skin_health) ??
      toNumberOrNull(results?.[0]?.average) ??
      toNumberOrNull(results?.[0]?.['qa-score'])
    );
  }

  private findImageId(results: any[] | null): string | null {
    const imageId = results?.find((item) => typeof item?.image_id === 'string')?.image_id;
    return imageId ?? null;
  }

  private findImageUrl(imageUrls: string[], imageId: string): string | null {
    return imageUrls.find((url) => url.endsWith(`/${imageId}`) || url.includes(imageId)) ?? null;
  }
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
