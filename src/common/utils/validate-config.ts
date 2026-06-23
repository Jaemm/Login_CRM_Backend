import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ClassConstructor } from 'class-transformer/types/interfaces';
import { ErrorStatus } from '../constants/error-status';
import { ErrorExceptionFactory } from '../middleWare/exceptions/exceptionHandling/error-exception.factory';

const logger = new Logger('validateConfig');

function validateConfig<T extends object>(
  config: Record<string, unknown>,
  EnvSchema: ClassConstructor<T>,
): T {
  const transformed = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(transformed, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((err) => `${err.property} - ${Object.values(err.constraints || {}).join(', ')}`)
      .join('; ');

    // Keep the detailed validation output in logs, but expose a translatable generic message.
    logger.error(`Configuration validation error: ${formattedErrors}`);
    throw ErrorExceptionFactory.createFromStatus('internal', ErrorStatus.SERVER_ERROR);
  }

  return transformed;
}

export default validateConfig;
