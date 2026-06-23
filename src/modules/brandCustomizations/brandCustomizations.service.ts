import { HttpException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ErrorExceptionFactory } from '@/src/common/middleWare/exceptions/exceptionHandling/error-exception.factory';
import { ErrorStatus } from '@/src/common/constants/error-status';
import {
  BrandCustomizationResponseDto,
  MediaDto,
  CustomizationDto,
  QuestionnaireQuestionDto,
  ResultKeywordDto,
  FlagsDto,
  MainPageDto,
  RepresentativeScoreDto,
  LocalizedMainPagesDto,
  LocalizedQuestionnaireDto,
  LocalizedResultKeywordsDto,
  TypeMeasurementDto,
} from './brandCustomizations.dto';

type RepresentativeScoreCategory = 'skin' | 'hair';

@Injectable()
export class BrandCustomizationsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getBrandCustomization(
    brandId: number,
    applicationId?: string,
  ): Promise<BrandCustomizationResponseDto> {
    try {
      /**
       * validation
       */
      if (!brandId) {
        throw ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
      }

      /**
       * brand 존재 확인
       */
      const brandCheck = await this.dataSource.query(
        `
        SELECT *
        FROM consultant_companies
        WHERE id = $1
        LIMIT 1
        `,
        [brandId],
      );

      if (!brandCheck.length) {
        throw ErrorExceptionFactory.createFromStatus('notFound', ErrorStatus.NOT_FOUND);
      }

      /**
       * customization 조회
       */
      const customizationResult = await this.dataSource.query(
        `
        SELECT *
        FROM consultant_customzations
        WHERE consultant_company_id = $1
        LIMIT 1
        `,
        [brandId],
      );

      const c = customizationResult?.[0] ?? {};
      const company = brandCheck[0] ?? {};
      const appId = this.parsePositiveInt(applicationId);

      /**
       * ActiveStorage 이미지 조회
       */
      const imageRows = await this.dataSource.query(
        `
        SELECT
          a.name,
          b.key
        FROM active_storage_attachments a
        JOIN active_storage_blobs b
          ON b.id = a.blob_id
        WHERE a.record_id = $1
        AND a.record_type = 'ConsultantCompany'
        `,
        [brandId],
      );

      /**
       * media 기본 슬롯
       */
      const media: MediaDto = {
        logo: null,
        signature: null,
        background_image: null,
        progress_bar_image_1: null,
        progress_bar_image_2: null,
        progress_bar_image_3: null,
        progress_bar_image_4: null,
        progress_bar_image_5: null,
        font_file: null,
      };

      let legacyMainPageImage: string | null = null;
      const localizedMainPageUrls = new Map<string, MainPageDto[]>();

      /**
       * screen saver 기본 슬롯
       */
      const screenSaver: Record<string, string | null> = {
        screen_saver_1: null,
        screen_saver_2: null,
        screen_saver_3: null,
        screen_saver_4: null,
        screen_saver_5: null,
      };

      const mainPages: Record<number, string | null> = {
        1: null,
        2: null,
        3: null,
        4: null,
      };

      /**
       * 이미지 분류
       */
      for (const img of imageRows || []) {
        if (!img.key) {
          continue;
        }

        const url = this.buildImageUrl(img.key);

        const mainPageMatch = /^main_page(?:_image)?_(\d+)$/.exec(img.name);
        const localizedMainPageWithIndexAndLanguageMatch =
          /^main_page_(\d+)_([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)_(\d+)$/.exec(img.name);
        const localizedMainPageWithLanguageMatch =
          /^main_page_([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)_(\d+)$/.exec(img.name);
        const localizedMainPageMatch =
          /^main_page_([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/.exec(img.name);

        if (localizedMainPageWithIndexAndLanguageMatch) {
          const index = Number(localizedMainPageWithIndexAndLanguageMatch[1]);
          if (index < 1 || index > 4) {
            continue;
          }

          this.addLocalizedMainPage(
            localizedMainPageUrls,
            `${localizedMainPageWithIndexAndLanguageMatch[2].toLowerCase()}_${localizedMainPageWithIndexAndLanguageMatch[3]}`,
            {
              index,
              url,
            },
          );
        } else if (localizedMainPageWithLanguageMatch) {
          this.addLocalizedMainPage(
            localizedMainPageUrls,
            `${localizedMainPageWithLanguageMatch[1].toLowerCase()}_${localizedMainPageWithLanguageMatch[2]}`,
            { index: 1, url },
          );
        } else if (localizedMainPageMatch) {
          this.addLocalizedMainPage(localizedMainPageUrls, localizedMainPageMatch[1].toLowerCase(), {
            index: 1,
            url,
          });
        } else if (mainPageMatch) {
          const index = Number(mainPageMatch[1]);

          if (mainPages[index] !== undefined) {
            mainPages[index] = url;
          }
        } else if (img.name.startsWith('screen_saver')) {
          const parts = img.name.split('_');
          const order = parts[2];
          const key = `screen_saver_${order}`;

          if (screenSaver[key] !== undefined) {
            screenSaver[key] = url;
          }
        } else if (img.name === 'main_page_image') {
          legacyMainPageImage = url;
        } else {
          const mediaKey = img.name as keyof MediaDto;

          if (media[mediaKey] !== undefined) {
            media[mediaKey] = url;
          }
        }
      }

      if (!mainPages[1] && legacyMainPageImage) {
        mainPages[1] = legacyMainPageImage;
      }

      const mainPageList: MainPageDto[] = Object.entries(mainPages)
        .filter(([_, url]) => url)
        .map(([index, url]) => ({
          index: Number(index),
          url: url as string,
        }));

      /**
       * screen saver DTO 변환
       */
      const screenSaverEnabled = this.toBooleanDefault(
        customizationResult?.[0]?.screen_saver_enabled,
        true,
      );
      const screenSaverList = screenSaverEnabled
        ? Object.entries(screenSaver)
            .filter(([_, url]) => url)
            .map(([name, url]) => ({
              index: Number(name.replace('screen_saver_', '')),
              url,
            }))
        : [];

      /**
       * customization mapping
       */
      const customization: CustomizationDto = {
        font: c.font ?? null,
        font_color_1: c.font_color_1 ?? null,
        font_color_2: c.font_color_2 ?? null,
        primary_color: c.primary_color_code ?? null,
        secondary_color: c.secondary_color_code ?? null,
        program_color: c.program_color_code ?? null,
        top_color: c.top_color_code ?? null,
        text_icon_color: c.text_icon_color_code ?? null,
        pie_chart_color_1: c.pie_chart_color_1 ?? null,
        pie_chart_color_2: c.pie_chart_color_2 ?? null,
        pie_chart_color_3: c.pie_chart_color_3 ?? null,
        pie_chart_color_4: c.pie_chart_color_4 ?? null,
        pie_chart_color_5: c.pie_chart_color_5 ?? null,
        pie_chart_points_color: c.pie_chart_points_color ?? null,
      };

      const [resultKeywords, questionnaire, languages] = appId
        ? await Promise.all([
            this.getResultKeywords(brandId, appId),
            this.getQuestionnaire(brandId, appId),
            this.getAvailableLanguages(brandId, appId),
          ])
        : [[], [], []];
      const localizedMainPages = this.localizeMainPages(
        mainPageList,
        localizedMainPageUrls,
        languages,
      );
      const flags = this.mapFlags(company, c);
      const representativeScore = await this.mapRepresentativeScore(c);

      /**
       * final response
       */
      return {
        result_code: 200,
        data: {
          customization,
          media,
          main_pages: localizedMainPages,
          screen_saver: screenSaverList,
          representative_score: representativeScore,
          result_keywords: resultKeywords,
          questionnaire,
          flags,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
    }
  }

  private buildImageUrl(key: string): string {
    const defaultBaseUrl =
      process.env.ENV === 'production'
        ? 'https://example.com'
        : 'https://example.com';
    const baseUrl = (process.env.URL || defaultBaseUrl).replace(/\/$/, '');
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');

    return `${baseUrl}/v1/api/image/${encodedKey}`;
  }

  private addLocalizedMainPage(
    localizedMainPageUrls: Map<string, MainPageDto[]>,
    key: string,
    page: MainPageDto,
  ): void {
    const pages = localizedMainPageUrls.get(key) ?? [];
    const existingPageIndex = pages.findIndex((item) => item.index === page.index);

    if (existingPageIndex >= 0) {
      pages[existingPageIndex] = page;
    } else {
      pages.push(page);
    }

    pages.sort((a, b) => a.index - b.index);
    localizedMainPageUrls.set(key, pages);
  }

  private parsePositiveInt(value?: string): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  private mapFlags(company: Record<string, any>, customization: Record<string, any>): FlagsDto {
    return {
      active: this.toNullableBoolean(customization.active),
      pmx: this.toNullableBoolean(customization.pmx),
      default_logo: this.toNullableBoolean(customization.chowis_logo),
      medical_version: this.toNullableBoolean(customization.medical_version),
      image_upload: this.toNullableBoolean(customization.image_upload),
      show_signature: this.toNullableBoolean(customization.show_signature),
      crm_sync: this.toNullableBoolean(company.is_crm_sync),
      simple_questionnaire: this.toNullableBoolean(company.is_simple_question),
      down_scoring: this.toNullableBoolean(company.is_down_scoring),
      reverse_scoring: this.toNullableBoolean(company.is_reverse_scoring),
      sales_connection: this.toNullableBoolean(company.is_sales_connection),
      analysis_webhook: this.toNullableBoolean(company.is_analysis_webhook),
      analysis_token: this.toNullableBoolean(company.analysis_token_active),
      custom_qr: this.toNullableBoolean(company.qr_custom_enabled),
      qr_code: this.toBooleanDefault(customization.qr_code_enabled, true),
      screen_saver: this.toBooleanDefault(customization.screen_saver_enabled, true),
      use_result_share: this.toBooleanDefault(customization.use_result_share, true),
    };
  }

  private async mapRepresentativeScore(
    customization: Record<string, any>,
  ): Promise<RepresentativeScoreDto> {
    const enabled = this.toBooleanDefault(customization.representative_score_type, false);
    const [skin, hair] = await this.getRepresentativeScoreMeasurements(
      enabled,
      customization,
    );

    return {
      enabled,
      skin,
      hair,
    };
  }

  private async getRepresentativeScoreMeasurements(
    enabled: boolean,
    customization: Record<string, any>,
  ): Promise<[TypeMeasurementDto | null, TypeMeasurementDto | null]> {
    if (!enabled) {
      return [null, null];
    }

    return Promise.all([
      this.getRepresentativeScoreTypeMeasurement(
        'skin',
        customization.representative_score_skin_type_measurement_id,
      ),
      this.getRepresentativeScoreTypeMeasurement(
        'hair',
        customization.representative_score_hair_type_measurement_id,
      ),
    ]);
  }

  private async getRepresentativeScoreTypeMeasurement(
    category: RepresentativeScoreCategory,
    measurementId: unknown,
  ): Promise<TypeMeasurementDto | null> {
    const representativeScoreTypeMeasurementId = Number(measurementId);

    if (
      !Number.isInteger(representativeScoreTypeMeasurementId) ||
      representativeScoreTypeMeasurementId <= 0
    ) {
      return null;
    }

    const rows: TypeMeasurementDto[] = await this.dataSource.query(
      `
      SELECT
        id,
        type_measurement_name AS name
      FROM representative_score_type_measurements
      WHERE id = $1
        AND representative_score_type = $2
        AND category = $3
        AND active = true
      LIMIT 1
      `,
      [representativeScoreTypeMeasurementId, category, category],
    );

    return rows[0] ?? null;
  }

  private toNullableBoolean(value: unknown): boolean | null {
    if (value === null || value === undefined) {
      return null;
    }

    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private toBooleanDefault(value: unknown, defaultValue: boolean): boolean {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private async getResultKeywords(
    brandId: number,
    applicationId: number,
  ): Promise<LocalizedResultKeywordsDto[]> {
    const rows: Array<{
      language_id: number;
      locale: string;
      id: string;
      value: string;
    }> = await this.dataSource.query(
      `
      WITH selected_keywords AS (
        SELECT DISTINCT ON (k.language_id)
          k.id,
          k.language_id,
          l.locale
        FROM keywords k
        JOIN languages l
          ON l.id = k.language_id
        WHERE k.consultant_company_id = $1
          AND k.application_id = $2
        ORDER BY k.language_id, k.updated_at DESC, k.id DESC
      )
      SELECT
        sk.language_id,
        sk.locale,
        kv.id,
        COALESCE(NULLIF(btrim(kv.custom_value), ''), kv.value) AS value
      FROM keyword_values kv
      JOIN selected_keywords sk
        ON sk.id = kv.keyword_id
      WHERE btrim(COALESCE(NULLIF(btrim(kv.custom_value), ''), kv.value)) <> ''
      ORDER BY sk.language_id ASC, kv.id ASC
      `,
      [brandId, applicationId],
    );

    const grouped = new Map<number, LocalizedResultKeywordsDto>();

    for (const row of rows || []) {
      const languageId = Number(row.language_id);

      if (!grouped.has(languageId)) {
        grouped.set(languageId, {
          language_id: languageId,
          locale: row.locale,
          keywords: [],
        });
      }

      const item = grouped.get(languageId);
      if (!item || item.keywords.length >= 5) {
        continue;
      }

      item.keywords.push({
        index: item.keywords.length + 1,
        value: row.value,
      });
    }

    return Array.from(grouped.values());
  }

  private async getQuestionnaire(
    brandId: number,
    applicationId: number,
  ): Promise<LocalizedQuestionnaireDto[]> {
    const rows: Array<{
      language_id: number;
      locale: string;
      questionnaire_type: string | null;
      question_id: string;
      question_content: string;
      question_position: number;
      answer_id: string;
      answer: string;
      answer_position: number;
    }> = await this.dataSource.query(
      `
      WITH selected_questionnaires AS (
        SELECT DISTINCT ON (q.language_id)
          q.id,
          q.language_id,
          l.locale,
          q.type AS questionnaire_type
        FROM questionnaires q
        JOIN languages l
          ON l.id = q.language_id
        WHERE q.consultant_company_id = $1
          AND q.application_id = $2
        ORDER BY q.language_id, q.updated_at DESC, q.id DESC
      )
      SELECT
        sq.language_id,
        sq.locale,
        sq.questionnaire_type,
        qq.id AS question_id,
        qq.content AS question_content,
        qq.position AS question_position,
        qa.id AS answer_id,
        qa.answer,
        qa.position AS answer_position
      FROM questionnaire_questions qq
      JOIN selected_questionnaires sq
        ON sq.id = qq.questionnaire_id
      JOIN questionnaire_answers qa
        ON qa.question_id = qq.id
      WHERE btrim(qq.content) <> ''
        AND btrim(qa.answer) <> ''
      ORDER BY sq.language_id ASC, qq.position ASC, qq.id ASC, qa.position ASC, qa.id ASC
      `,
      [brandId, applicationId],
    );

    const localized = new Map<number, LocalizedQuestionnaireDto>();
    const questions = new Map<string, QuestionnaireQuestionDto>();

    for (const row of rows || []) {
      const languageId = Number(row.language_id);
      const questionId = Number(row.question_id);
      const questionKey = `${languageId}:${questionId}`;

      if (!localized.has(languageId)) {
        localized.set(languageId, {
          language_id: languageId,
          locale: row.locale,
          type: this.normalizeQuestionnaireType(row.questionnaire_type),
          questions: [],
        });
      }

      if (!questions.has(questionKey)) {
        const question: QuestionnaireQuestionDto = {
          id: questionId,
          content: row.question_content,
          position: Number(row.question_position),
          answers: [],
        };

        questions.set(questionKey, question);
        localized.get(languageId)?.questions.push(question);
      }

      questions.get(questionKey)?.answers.push({
        id: Number(row.answer_id),
        answer: row.answer,
        position: Number(row.answer_position),
      });
    }

    return Array.from(localized.values());
  }

  private normalizeQuestionnaireType(value: unknown): string {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return ['skin', 'hair', 'skin_hair'].includes(normalized) ? normalized : 'unknown';
  }

  private async getAvailableLanguages(
    brandId: number,
    applicationId: number,
  ): Promise<Array<{ language_id: number; locale: string }>> {
    return this.dataSource.query(
      `
      SELECT DISTINCT
        l.id AS language_id,
        l.locale
      FROM languages l
      WHERE EXISTS (
        SELECT 1
        FROM questionnaires q
        WHERE q.language_id = l.id
          AND q.consultant_company_id = $1
          AND q.application_id = $2
      )
      OR EXISTS (
        SELECT 1
        FROM keywords k
        WHERE k.language_id = l.id
          AND k.consultant_company_id = $1
          AND k.application_id = $2
      )
      ORDER BY l.id ASC
      `,
      [brandId, applicationId],
    );
  }

  private localizeMainPages(
    mainPages: MainPageDto[],
    localizedMainPageUrls: Map<string, MainPageDto[]>,
    languages: Array<{ language_id: number; locale: string }>,
  ): LocalizedMainPagesDto[] {
    if (!mainPages.length && localizedMainPageUrls.size === 0) {
      return [];
    }

    const targetLanguages = languages.length ? languages : [{ language_id: 44, locale: 'en' }];

    return targetLanguages
      .flatMap((language, index) => {
        const languageId = Number(language.language_id);
        const normalizedLocale = language.locale.toLowerCase();
        const languageSpecificPages =
          localizedMainPageUrls.get(`${normalizedLocale}_${languageId}`) ||
          localizedMainPageUrls.get(`${normalizedLocale.split('-')[0]}_${languageId}`) ||
          localizedMainPageUrls.get(normalizedLocale) ||
          localizedMainPageUrls.get(normalizedLocale.split('-')[0]);
        const fallbackPage = mainPages[index] ?? mainPages[0] ?? null;
        const pages = languageSpecificPages ?? (fallbackPage ? [fallbackPage] : []);

        return pages.map((page) => ({
          position: page.index,
          language_id: languageId,
          locale: language.locale,
          url: page.url,
        }));
      })
      .sort((a, b) => {
        const indexDiff = a.position - b.position;
        return indexDiff || a.language_id - b.language_id;
      });
  }
}
