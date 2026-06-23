/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum ErrorStatus {
  SUCCESS = 200,

  /* =========================
   * 인증 / 토큰 (Auth & Token)
   * ========================= */
  AUTHENTICATION_ERROR = 1000,
  PERMISSION_DENIED = 1001,
  UNAUTHORIZED = 1002,
  MISSING_ACCESS_TOKEN = 1003,
  INVALID_ACCESS_TOKEN = 1004,
  JSON_WEBTOKEN_ERROR = 1004,
  ACCESS_TOKEN_TIME_OUT = 1005,
  CUSTOM_TOKEN_ERROR = 1005,
  TOKEN_EXPIRED = 1005,
  INCORRECT_PASSWORD = 1006,
  LOGIN_FAILED = 1007,
  SOCIAL_LOGIN_FAILED = 1008,
  SOCIAL_LOGIN_NOT_REGISTERED = 1009,
  EMAIL_NOT_CONFIRMED = 1010,

  /* =========================
   * 요청 / 파라미터 / 검증 (Request & Validation)
   * ========================= */
  BAD_REQUEST = 2000,
  VALIDATION_ERROR = 2000,
  INVALID_PARAMETERS = 2001,
  INVALID_REQUEST = 2002,
  INVALID_RECORD = 2003,
  NO_DATE = 2004,
  BATCH_ID_REQUIRED = 2005,
  BATCH_ID_ALREADY_USED = 2006,
  NO_DATA_WITH_THIS_BATCH_ID = 2007,

  /* =========================
   * 데이터 / 레코드
   * ========================= */
  RECORD_NOT_FOUND = 3000,
  CUSTOMER_NOT_FOUND = 3001,
  NOT_FOUND = 3000,
  DATA_ALREADY_EXIST = 3002,
  ACCOUNT_ALREADY_EXISTS = 3003,

  /* =========================
   * 디바이스 / 제품
   * ========================= */
  PRODUCT_CREDS_REQUIRED = 4000,
  PRODUCT_NOT_FOUND = 4001,
  DEVICE_ALREADY_IN_USE = 4002,
  DEVICE_ALREADY_REGISTERED = 4003,

  /* =========================
   * 라이선스
   * ========================= */
  LICENSE_NOT_FOUND = 4004,
  LICENSE_NOT_UPDATED = 4005,

  /* =========================
   * 계정 / 등록 / 변경 / 커스텀
   * ========================= */
  REGISTRATION_FAILED = 5000,
  PASSWORD_CHANGE_FAILED = 5001,
  FAILED = 5002,
  CUSTOM_ERROR = 5002,
  CUSTOM_ERROR_CONSULTANT = 5003,

  /* =========================
   * 시스템 / 서버
   * ========================= */
  SERVER_ERROR = 6000,
  INTERNAL_SERVER_ERROR = 6000,
  UNEXPECTED_ERROR = 6002,
}
