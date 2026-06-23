import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HeaderNormalizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // locale
    const locale =
      req.headers['x-locale'] ||
      req.headers['x-chowis-locale'] ||
      req.headers['x-chowis-consultant-locale'] ||
      req.headers['x-choicedx-locale'];

    if (locale) {
      req.headers['x-locale'] = locale;
    }

    // consultant company
    const company =
      req.headers['x-consultant-company'] || req.headers['x-chowis-consultant-company'];

    if (company) {
      req.headers['x-consultant-company'] = company;
    }

    next();
  }
}
