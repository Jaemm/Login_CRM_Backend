import {
  ArgumentsHost,
  Catch,
  ConsoleLogger,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Response, Request } from 'express';
import { DataSource, QueryFailedError } from 'typeorm';
import { CustomHttpExceptionResponse } from './interface/http-exception.interface';
import { ErrorResponseService } from './error-response.service';
import { AirbrakeReporter } from '@chowis/observability';
import { ErrorStatus } from '@/src/common/constants/error-status';
import { createErrorResponse } from '@/src/common/response/api-response';
import { getAirbrakeContext } from './airbrake-context.util';
import { getClientIp, getForwardedFor } from '@/src/common/utils/request-client-ip';
import { getEnglishErrorMessage } from './error-translation.catalog';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly airbrake = new AirbrakeReporter({ serviceName: 'login-crm' });
  private readonly logger = new ConsoleLogger(AllExceptionsFilter.name);
  private readonly appNameCache = new Map<number, string | null>();

  constructor(
    private readonly errorResponseService: ErrorResponseService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async catch(exception: any, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception.status || HttpStatus.INTERNAL_SERVER_ERROR;

    const customStatus = this.resolveResultCode(exception?.response, httpStatus);

    const language = this.errorResponseService.normalizeLanguage(
      request.header('X-LOCAL') ||
        request.header('x-locale') ||
        request.header('x-chowis-locale') ||
        request.header('x-chowis-consultant-locale'),
    );
    const finalErrorMessage = this.resolveErrorMessage(
      exception?.response,
      language,
      customStatus,
    );

    const errorResponse = this.buildErrorResponse(customStatus, finalErrorMessage, request);

    if (!this.shouldSkipExceptionLogging(request, httpStatus)) {
      const logPayload = await this.buildErrorLog(errorResponse, request, exception);
      const logMessage = JSON.stringify(logPayload);
      if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(logMessage);
      } else if (httpStatus >= HttpStatus.BAD_REQUEST) {
        this.logger.warn(logMessage);
      } else {
        this.logger.log(logMessage);
      }

      if (this.shouldReportToAirbrake(httpStatus, customStatus, request)) {
        this.reportToAirbrake(exception, httpStatus, customStatus, errorResponse, request, finalErrorMessage)
          .catch(() => {});
      }
    }

    response.status(httpStatus).json(errorResponse);
  }

  private resolveErrorMessage(
    exceptionResponse: any,
    language: string,
    status: HttpStatus | ErrorStatus,
  ): string {
    const payloadMessage =
      typeof exceptionResponse?.error === 'string' ? exceptionResponse.error.trim() : '';

    if (payloadMessage) {
      const englishCatalogMessage = getEnglishErrorMessage(Number(status));
      if (englishCatalogMessage && payloadMessage === englishCatalogMessage) {
        return this.errorResponseService.resolveMessage(language, status);
      }

      return payloadMessage;
    }

    return this.errorResponseService.resolveMessage(language, status);
  }

  private shouldSkipExceptionLogging(request: Request, httpStatus: number): boolean {
    const path = request.path || request.url || '';

    return httpStatus === HttpStatus.NOT_FOUND && path === '/favicon.ico';
  }

  private shouldReportToAirbrake(
    httpStatus: number,
    resultCode: number,
    request: Request,
  ): boolean {
    return this.airbrake.shouldReport({
      httpStatus,
      resultCode,
      requestPath: request.path || request.url || '',
      skip: this.shouldSkipExceptionLogging(request, httpStatus),
    });
  }

  private buildErrorResponse(
    status: HttpStatus | ErrorStatus,
    errorMessage: string,
    request: Request,
  ): CustomHttpExceptionResponse {
    return createErrorResponse(status, errorMessage, {
      path: request.url,
      method: request.method,
      timeStamp: new Date(),
    });
  }

  private resolveResultCode(response: any, httpStatus: number): number {
    const payloadCode = Number(response?.result_code);
    if (Number.isFinite(payloadCode)) {
      return payloadCode;
    }

    switch (httpStatus) {
      case HttpStatus.BAD_REQUEST:
        return ErrorStatus.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorStatus.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorStatus.PERMISSION_DENIED;
      case HttpStatus.NOT_FOUND:
        return ErrorStatus.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorStatus.DATA_ALREADY_EXIST;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorStatus.VALIDATION_ERROR;
      case HttpStatus.GATEWAY_TIMEOUT:
        return ErrorStatus.SERVER_ERROR;
      case HttpStatus.INTERNAL_SERVER_ERROR:
      default:
        return ErrorStatus.SERVER_ERROR;
    }
  }

  private async buildErrorLog(
    errorResponse: CustomHttpExceptionResponse,
    request: Request,
    exception: unknown,
  ): Promise<Record<string, unknown>> {
    const clientIp = getClientIp(request);
    const forwardedFor = getForwardedFor(request);
    const userContext = this.extractUserContext(request);
    const appContext = await this.extractApplicationContext(request);
    const fallbackStatus =
      typeof exception === 'object' && exception !== null && 'status' in exception
        ? Number((exception as { status?: unknown }).status) || HttpStatus.INTERNAL_SERVER_ERROR
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload: Record<string, unknown> = {
      method: request.method,
      path: request.url,
      status: exception instanceof HttpException ? exception.getStatus() : fallbackStatus,
      result_code: errorResponse.result_code,
      error: errorResponse.error,
      requestId: this.airbrake.getRequestId(request),
      ip: clientIp,
      userAgent: request.headers['user-agent'],
    };

    if (forwardedFor) {
      payload.forwardedFor = forwardedFor;
    }

    if (userContext?.id) {
      payload.userId = userContext.id;
    }

    if (userContext?.consultantId) {
      payload.consultantId = userContext.consultantId;
    }

    if (userContext?.companyId) {
      payload.companyId = userContext.companyId;
    }

    if (appContext.appId) {
      payload.appId = appContext.appId;
    }

    if (appContext.appName) {
      payload.appName = appContext.appName;
    }

    if (appContext.consultantCompany) {
      payload.consultantCompany = appContext.consultantCompany;
    }

    const body = this.airbrake.mask(request.body);
    if (body && Object.keys(body).length) {
      payload.body = body;
    }

    const databaseError = this.extractDatabaseError(exception);
    if (databaseError) {
      payload.dbError = databaseError;
    }

    const exceptionName =
      exception instanceof Error
        ? exception.name
        : typeof exception === 'object'
        ? exception?.constructor?.name
        : undefined;
    if (exceptionName) {
      payload.exception = exceptionName;
    }

    const stackPreview = this.getStackPreview(exception);
    if (stackPreview) {
      payload.at = stackPreview;
    }

    return payload;
  }

  private extractDatabaseError(exception: unknown): Record<string, unknown> | undefined {
    const driverError = this.resolveDriverError(exception);

    if (!driverError) {
      return undefined;
    }

    const detail = this.getStringProperty(driverError, 'detail');
    const code = this.getStringProperty(driverError, 'code');
    const constraint = this.getStringProperty(driverError, 'constraint');
    const table = this.getStringProperty(driverError, 'table');
    const column = this.getStringProperty(driverError, 'column');
    const schema = this.getStringProperty(driverError, 'schema');
    const routine = this.getStringProperty(driverError, 'routine');
    const severity = this.getStringProperty(driverError, 'severity');
    const where = this.getStringProperty(driverError, 'where');
    const position = this.getStringProperty(driverError, 'position');

    const dbError: Record<string, unknown> = {};

    if (code) dbError.code = code;
    if (severity) dbError.severity = severity;
    if (constraint) dbError.constraint = constraint;
    if (schema) dbError.schema = schema;
    if (table) dbError.table = table;
    if (column) dbError.column = column;
    if (routine) dbError.routine = routine;
    if (where) dbError.where = where;
    if (position) dbError.position = position;
    if (detail) dbError.detail = detail;

    return Object.keys(dbError).length ? dbError : undefined;
  }

  private resolveDriverError(exception: unknown): unknown {
    if (exception instanceof QueryFailedError) {
      return exception.driverError;
    }

    if (!exception || typeof exception !== 'object') {
      return undefined;
    }

    const candidate = exception as { driverError?: unknown };
    return candidate.driverError;
  }

  private getStringProperty(source: unknown, key: string): string | undefined {
    if (!source || typeof source !== 'object') {
      return undefined;
    }

    const value = (source as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private maskBody(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return undefined;
    }

    const clone = { ...(body as Record<string, unknown>) };

    if (clone.password) clone.password = '***';
    if (clone.new_password) clone.new_password = '***';
    if (clone.refresh_token) clone.refresh_token = '***';
    if (clone.token) clone.token = '***';

    return clone;
  }

  private getStackPreview(exception: unknown): string | undefined {
    if (!(exception instanceof Error) || !exception.stack) {
      return undefined;
    }

    return exception.stack
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .find((line) => line.startsWith('at '));
  }

  private async reportToAirbrake(
    exception: unknown,
    httpStatus: number,
    status: HttpStatus | ErrorStatus,
    errorResponse: CustomHttpExceptionResponse,
    request: Request,
    translatedMessage: string,
  ): Promise<void> {
    const noticeError =
      exception instanceof Error
        ? exception
        : new Error(`result_code: ${status}; message: ${translatedMessage}`);

    const requestId = this.airbrake.getRequestId(request);
    const userContext = this.extractUserContext(request);
    const exceptionContext = getAirbrakeContext(exception);
    const clientIp = getClientIp(request);
    const forwardedFor = getForwardedFor(request);
    const appContext = await this.extractApplicationContext(request);

    await this.airbrake.notify({
      exception: noticeError,
      request,
      httpStatus,
      resultCode: Number(status),
      context: {
        userAddr: clientIp,
        ...(appContext.appId ? { appId: appContext.appId } : {}),
        ...(appContext.appName ? { appName: appContext.appName } : {}),
        ...(appContext.consultantCompany ? { consultantCompany: appContext.consultantCompany } : {}),
        ...(forwardedFor ? { forwardedFor } : {}),
        ...(exceptionContext || {}),
      },
      params: this.airbrake.mask(request.body),
      session: {
        ip: clientIp,
        requestId,
      },
      ...(userContext ? { user: userContext } : {}),
    });
  }

  private extractUserContext(request: Request):
    | { id?: string; consultantId?: string; companyId?: string; appId?: string; appName?: string }
    | undefined {
    const user = request.user;
    if (!user || typeof user !== 'object') {
      return undefined;
    }

    const record = user as Record<string, unknown>;
    const context = {
      id: this.toStringValue(record.id),
      consultantId: this.toStringValue(record.consultant_id ?? record.consultantId),
      companyId: this.toStringValue(record.company_id ?? record.companyId),
      appId: this.toStringValue(record.app_id ?? record.appId),
      appName: this.toStringValue(record.application ?? record.app_name ?? record.appName),
    };

    return Object.values(context).some(Boolean) ? context : undefined;
  }

  private async extractApplicationContext(request: Request): Promise<{
    appId?: string;
    appName?: string;
    consultantCompany?: string;
  }> {
    const user = request.user && typeof request.user === 'object'
      ? (request.user as Record<string, unknown>)
      : undefined;

    const appId = this.firstDefinedString(
      this.toStringValue(user?.app_id ?? user?.appId),
      this.toStringValue((request.body as Record<string, unknown> | undefined)?.app_id),
      this.toStringValue((request.body as Record<string, unknown> | undefined)?.appId),
      this.toStringValue((request.query as Record<string, unknown> | undefined)?.app_id),
      this.toStringValue((request.query as Record<string, unknown> | undefined)?.appId),
      this.extractHeaderValue(request, 'x-app-id'),
      this.extractHeaderValue(request, 'x-appid'),
    );

    const consultantCompany = this.firstDefinedString(
      this.toStringValue(user?.consultant_company_id ?? user?.consultantCompanyId),
      this.toStringValue((request.body as Record<string, unknown> | undefined)?.consultant_company_id),
      this.toStringValue((request.body as Record<string, unknown> | undefined)?.consultantCompanyId),
      this.toStringValue((request.query as Record<string, unknown> | undefined)?.consultant_company_id),
      this.toStringValue((request.query as Record<string, unknown> | undefined)?.consultantCompanyId),
      this.extractHeaderValue(request, 'x-consultant-company'),
    );

    const appNameCandidate = this.firstDefinedString(
      this.toStringValue(user?.application ?? user?.app_name ?? user?.appName),
      this.toStringValue((request.body as Record<string, unknown> | undefined)?.application),
      this.toStringValue((request.body as Record<string, unknown> | undefined)?.app_name),
      this.toStringValue((request.body as Record<string, unknown> | undefined)?.appName),
      this.extractHeaderValue(request, 'x-app-name'),
    );

    const appName = appNameCandidate || (appId ? await this.resolveApplicationName(appId) : undefined);

    return {
      ...(appId ? { appId } : {}),
      ...(appName ? { appName } : {}),
      ...(consultantCompany ? { consultantCompany } : {}),
    };
  }

  private async resolveApplicationName(appId: string): Promise<string | undefined> {
    const parsedAppId = Number(appId);
    if (!Number.isFinite(parsedAppId)) {
      return undefined;
    }

    if (this.appNameCache.has(parsedAppId)) {
      return this.appNameCache.get(parsedAppId) ?? undefined;
    }

    try {
      const rows = (await this.dataSource.query(
        'SELECT name FROM applications WHERE id = $1 LIMIT 1',
        [parsedAppId],
      )) as Array<{ name?: string | null }>;

      const appName = this.toStringValue(rows[0]?.name) ?? null;
      this.appNameCache.set(parsedAppId, appName);
      return appName ?? undefined;
    } catch (_error) {
      this.appNameCache.set(parsedAppId, null);
      return undefined;
    }
  }

  private extractHeaderValue(request: Request, headerName: string): string | undefined {
    const value = request.headers[headerName];
    const candidate = Array.isArray(value) ? value[0] : value;
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
  }

  private firstDefinedString(...values: Array<string | undefined>): string | undefined {
    return values.find((value) => typeof value === 'string' && value.trim());
  }

  private toStringValue(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return undefined;
  }
}
