type ResponseContext = {
  path?: string;
  method?: string;
  timeStamp?: Date;
};

export interface SuccessApiResponse<T = unknown> {
  result_code: number;
  message: string;
  data: T | null;
  path?: string | null;
  method?: string | null;
  timeStamp?: Date | null;
}

export interface ErrorApiResponse {
  result_code: number;
  error: string;
  path: string | null;
  method: string | null;
  timeStamp: Date | null;
}

export function createErrorResponse(
  resultCode: number,
  error: string,
  context?: ResponseContext,
): ErrorApiResponse {
  return {
    result_code: resultCode,
    error,
    path: context?.path ?? null,
    method: context?.method ?? null,
    timeStamp: context?.timeStamp ?? null,
  };
}

export function createSuccessResponse<T = unknown>(
  resultCode: number,
  message: string,
  data?: T,
  context?: ResponseContext,
): SuccessApiResponse<T> {
  const response: SuccessApiResponse<T> = {
    result_code: resultCode,
    message,
    data: (data ?? null) as T | null,
  };

  if (context?.path !== undefined) {
    response.path = context.path;
  }

  if (context?.method !== undefined) {
    response.method = context.method;
  }

  if (context?.timeStamp !== undefined) {
    response.timeStamp = context.timeStamp;
  }

  return response;
}
