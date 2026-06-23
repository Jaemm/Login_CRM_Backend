import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly requestIdHeader = 'x-request-id';

  use(req: Request, res: Response, next: NextFunction): void {
    const incomingRequestId = req.headers[this.requestIdHeader];
    const requestId = Array.isArray(incomingRequestId)
      ? incomingRequestId[0]
      : incomingRequestId;

    const normalizedRequestId =
      typeof requestId === 'string' && requestId.trim() ? requestId.trim() : randomUUID();

    req.headers[this.requestIdHeader] = normalizedRequestId;
    res.setHeader(this.requestIdHeader, normalizedRequestId);

    next();
  }
}
