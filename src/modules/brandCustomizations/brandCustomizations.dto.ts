export class ScreenSaverDto {
  index: number;
  url: string;
}

export class MainPageDto {
  index: number;
  url: string;
}

export class LocalizedMainPagesDto {
  position: number;
  language_id: number;
  locale: string;
  url: string;
}

export class MediaDto {
  logo: string | null;
  signature: string | null;
  background_image: string | null;
  progress_bar_image_1: string | null;
  progress_bar_image_2: string | null;
  progress_bar_image_3: string | null;
  progress_bar_image_4: string | null;
  progress_bar_image_5: string | null;
  font_file: string | null;
}

export class CustomizationDto {
  font: string | null;
  font_color_1: string | null;
  font_color_2: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  program_color: string | null;
  top_color: string | null;
  text_icon_color: string | null;
  pie_chart_color_1: string | null;
  pie_chart_color_2: string | null;
  pie_chart_color_3: string | null;
  pie_chart_color_4: string | null;
  pie_chart_color_5: string | null;
  pie_chart_points_color: string | null;
}

export class ResultKeywordDto {
  index: number;
  value: string;
}

export class LocalizedResultKeywordsDto {
  language_id: number;
  locale: string;
  keywords: ResultKeywordDto[];
}

export class QuestionnaireAnswerDto {
  id: number;
  answer: string;
  position: number;
}

export class QuestionnaireQuestionDto {
  id: number;
  content: string;
  position: number;
  answers: QuestionnaireAnswerDto[];
}

export class LocalizedQuestionnaireDto {
  language_id: number;
  locale: string;
  type: string;
  questions: QuestionnaireQuestionDto[];
}

export class FlagsDto {
  active: boolean | null;
  pmx: boolean | null;
  default_logo: boolean | null;
  medical_version: boolean | null;
  image_upload: boolean | null;
  show_signature: boolean | null;
  crm_sync: boolean | null;
  simple_questionnaire: boolean | null;
  down_scoring: boolean | null;
  reverse_scoring: boolean | null;
  sales_connection: boolean | null;
  analysis_webhook: boolean | null;
  analysis_token: boolean | null;
  custom_qr: boolean | null;
  qr_code: boolean | null;
  screen_saver: boolean | null;
  use_result_share: boolean | null;
}

export class RepresentativeScoreDto {
  enabled: boolean;
  skin: TypeMeasurementDto | null;
  hair: TypeMeasurementDto | null;
}

export class TypeMeasurementDto {
  id: number;
  name: string;
}

export class BrandCustomizationResultDto {
  customization: CustomizationDto;
  media: MediaDto;
  main_pages: LocalizedMainPagesDto[];
  screen_saver: ScreenSaverDto[];
  representative_score: RepresentativeScoreDto;
  result_keywords: LocalizedResultKeywordsDto[];
  questionnaire: LocalizedQuestionnaireDto[];
  flags: FlagsDto;
}

export class BrandCustomizationResponseDto {
  result_code: number;
  data: BrandCustomizationResultDto;
}
