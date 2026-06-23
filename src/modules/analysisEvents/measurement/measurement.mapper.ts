export class MeasurementPayloadMapper {
  private toNumberOrNull(v: any): number | null {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  map(nthAnalysis: string, rows: any[]): any {
    let scoreRow: any = null;
    let originalImage: string | null = null;
    let analysisImage: string | null = null;

    for (const row of rows) {
      if (row.type_image_id === 21) {
        scoreRow = row; // 점수 + originalImage
        originalImage = row.url?.startsWith('http')
          ? row.url
          : row.url
            ? `https://${row.url}`
            : null;
      }

      if (row.type_image_id === 18) {
        analysisImage = row.url?.startsWith('http')
          ? row.url
          : row.url
            ? `https://${row.url}`
            : null;
      }
    }

    const scores = scoreRow?.scores ?? {};
    const typeId = rows[0]?.type_measurement_id;

    /* =========================
     * skinCondition / skinAge
     * ========================= */
    if (Number(typeId) === 18) {
      return {
        skinAge: scores.skinAge ?? null,
        skinCondition: scores.skinCondition ?? null,
      };
    }

    /* =========================
     * 일반 타입
     * ========================= */
    return {
      nth_analysis: nthAnalysis,
      raw: this.toNumberOrNull(scores.raw),
      score: this.toNumberOrNull(scores.score),
      computation_score: this.toNumberOrNull(scores.computation_score),
      keyword: scores.keyWord ?? null, // keyword 추가
      originalImage,
      analysisImage,
    };
  }
}
