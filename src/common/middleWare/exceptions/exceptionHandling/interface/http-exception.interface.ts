export interface HttpExceptionResponse {
  result_code: number;
  error: string;
  path: string | null;
  method: string | null;
  timeStamp: Date | null;
}

export interface CustomHttpExceptionResponse extends HttpExceptionResponse {}
