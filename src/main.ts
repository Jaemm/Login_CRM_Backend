import './register-paths';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  Logger,
  ValidationPipe,
  RequestMethod,
} from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as nocache from 'nocache';
import 'winston-daily-rotate-file';
import { ErrorStatus } from './common/constants/error-status';
import { ErrorExceptionFactory } from './common/middleWare/exceptions/exceptionHandling/error-exception.factory';

function resolveTrustProxySetting(value: string | undefined): boolean | number | string {
  if (!value || value === 'true') {
    return 1;
  }

  if (value === 'false') {
    return false;
  }

  const asNumber = Number(value);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return value;
}

async function bootstrap() {
  const SSL = process.env.SSL;
  const HOSTNAME = process.env.HOSTNAME;
  const port = Number(process.env.PORT) || 3100;

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('/v1/api', {
    exclude: [
      { path: 'metrics', method: RequestMethod.GET },
      { path: 'docs-md', method: RequestMethod.GET },
      { path: 'docs-md/(.*)', method: RequestMethod.GET },
    ],
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(helmet.noSniff());
  app.use(helmet.frameguard({ action: 'sameorigin' }));
  app.use(helmet.permittedCrossDomainPolicies());
  app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));

  app.use(nocache());

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', resolveTrustProxySetting(process.env.TRUST_PROXY));

  if (process.env.OPEN_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Chowis Login CRM')
      .setDescription(
        'Chowis Login CRM<br><br>' +
          '<b>Staging</b>: https://staging.example.com<br><br>' +
          '<b>Production</b>: https://example.com<br><br>' +
          '<b>CTK</b>: https://ctk.example.com<br><br>',
      )
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((err) => Object.values(err.constraints || {}));
        Logger.warn(
          JSON.stringify({
            message: 'Request validation failed',
            errors: messages,
          }),
        );
        return ErrorExceptionFactory.createFromStatus('badRequest', ErrorStatus.BAD_REQUEST);
      },
    }),
  );

  app.enableCors();

  await app.listen(port, () => {
    const protocol = SSL === 'true' ? 'https' : 'http';
    const address = `${protocol}://${SSL === 'true' ? HOSTNAME : '0.0.0.0'}:${port}`;
    Logger.log('Listening at ' + address);
  });
}

bootstrap();
