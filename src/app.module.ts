import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from '@hapi/joi';
import { globalDB, cndpSkinDB, cndpHairDB, cmaSkinDB, cmaHairDB } from './config/typeOrm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './common/common.module';
import { ConsultantsModule } from './modules/consultants/consultants.module';
import { AwsS3Module } from './common/awsS3/awsS3.module';
import { ImageModule } from './modules/image/image.module';
import config from './config/config.schema';
import { DeviceModule } from './modules/devices/devices.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ConsultantShopsModule } from './modules/consultantShops/consultantShops.module';
import { GendersModule } from './modules/genders/genders.module';
import { CountriesModule } from './modules/countries/countries.module';
import { EthinicitiesModule } from './modules/ethinicities/ethinicities.module';
import { SkinColorGroupsModule } from './modules/skinColorGroups/skinColorGroups.module';
import { ConsultantPositionsModule } from './modules/consultantPositions/consultantPositions.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthMiddleware } from './common/middleWare/authMiddlware/auth.middleware';
import { CustomerConsentsModule } from './modules/customerConsents/customerConsents.module';
import { StoreModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { HealthModule } from './modules/apiHealthCheck/apiHealth.module';
import { CRMModule } from './modules/crm/crm.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/middleWare/exceptions/exceptionHandling/allException.filter';
import { LoggingMiddleware } from './common/middleWare/logMiddleWare/logging.middleware';
import { ChowisServiceModule } from './modules/chowis-service/chowis-service.module';
import { AuthGoogleService } from './jwt/google.service';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { WebResultModule } from './modules/webResultManagement/webResultManagement.module';
import { ActiveStorageModule } from './modules/activeStorage/activeStorage.module';
import { AdminUsersModule } from './modules/adminUser/adminUser.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { PrometheusInterceptor } from './common/interceptors/prometheus.interceptor';
import { JusoModule } from './modules/juso/juso.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalysisEventsModule } from './modules/analysisEvents/analysisEvents.module';
import { HeaderNormalizationMiddleware } from './common/middleWare/headerMiddleWare/header-normalization.middleware';
import { BrandCustomizationsModule } from './modules/brandCustomizations/brandCustomizations.module';
import { RequestIdMiddleware } from './common/middleWare/requestIdMiddleWare/request-id.middleware';
import { DocsModule } from './modules/docs/docs.module';
import { BullModule } from '@nestjs/bullmq';
import { buildBullQueueOptions } from './config/redis-queue.config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MonitoringModule,
    DocsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        PORT: Joi.number(),

        EMAIL_HOST_OUTLOOK: Joi.string().required(),
        EMAIL_USER_OUTLOOK: Joi.string().required(),
        EMAIL_PASSWORD_OUTLOOK: Joi.string().required(),
        BREVO_API_KEY: Joi.string().optional(),
        BREVO_BASE_URL: Joi.string().uri().optional(),
        BREVO_MARKETING_LIST_ID: Joi.number().optional(),
        REDIS_URL: Joi.string().uri().optional(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().optional(),
        REDIS_PASSWORD: Joi.string().optional(),
        REDIS_DB: Joi.number().optional(),
        EMAIL_QUEUE_CONCURRENCY: Joi.number().optional(),

        MICROSOFT_CLIENT_ID: Joi.string().uuid().required(),
        MICROSOFT_CLIENT_SECRET: Joi.string().required(),
        MICROSOFT_AUTH_ENDPOINT: Joi.string().uri().required(),
        MICROSOFT_TOKEN_ENDPOINT: Joi.string().uri().required(),

        APP_ID: Joi.string().uuid({ version: 'uuidv4' }).required(),
        JWT_CONFIRMATION_TIME: Joi.string().required(),
        JWT_RESET_PASSWORD_SECRET: Joi.string().required(),
        JWT_RESET_PASSWORD_TIME: Joi.string().required(),
        DOMAIN: Joi.string().required(),

        CNDP_SKIN: Joi.string().optional(),
        CNDP_HAIR: Joi.string().optional(),
        CMA_SKIN: Joi.string().optional(),
        CMA_HAIR: Joi.string().optional(),
        ANALYSIS_WEBHOOK_ALLOWED_SOURCES: Joi.string().optional(),
        ANALYSIS_COLLECTOR_URL: Joi.string().uri().optional(),
        PRIVACY_REQUEST_NOTIFICATION_EMAIL: Joi.string().email().optional(),
        GDPR_PRIVACY_REQUEST_RETENTION_DAYS: Joi.number().optional(),
        GDPR_PRIVACY_REQUEST_PENDING_ESCALATION_DAYS: Joi.number().optional(),
      }),
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['env/.env'],
      load: [config, globalDB, cndpSkinDB, cndpHairDB, cmaSkinDB, cmaHairDB],
    }),

    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/production.log' }),
      ],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildBullQueueOptions,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('globalDB'),
        autoLoadEntities: true,
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'cndpSkinDB',
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('cndpSkinDB'),
        autoLoadEntities: true,
        logger: 'advanced-console',
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'cndpHairDB',
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('cndpHairDB'),
        autoLoadEntities: true,
        logger: 'advanced-console',
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'cmaSkinDB',
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('cmaSkinDB'),
        autoLoadEntities: true,
        logger: 'advanced-console',
      }),
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      name: 'cmaHairDB',
      useFactory: async (configService: ConfigService) => ({
        ...configService.get('cmaHairDB'),
        autoLoadEntities: true,
        logger: 'advanced-console',
      }),
    }),

    ConsultantsModule,
    CustomersModule,
    StoreModule,
    AuthModule,
    CommonModule,
    HealthModule,
    AwsS3Module,
    ImageModule,
    DeviceModule,
    ApplicationsModule,
    ConsultantShopsModule,
    GendersModule,
    CountriesModule,
    EthinicitiesModule,
    SkinColorGroupsModule,
    ConsultantPositionsModule,
    CustomerConsentsModule,
    ProductsModule,
    CRMModule,
    ChowisServiceModule,
    WebResultModule,
    ActiveStorageModule,
    AdminUsersModule,
    JusoModule,
    AnalysisEventsModule,
    BrandCustomizationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    AuthGoogleService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrometheusInterceptor,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HeaderNormalizationMiddleware).forRoutes('*');
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer.apply(AuthMiddleware).forRoutes(
      {
        path: '/shops',
        method: RequestMethod.GET,
      },
      {
        path: '/shops-list',
        method: RequestMethod.GET,
      },
      {
        path: '/basic-details-customers',
        method: RequestMethod.GET,
      },
      {
        path: '/countries-list',
        method: RequestMethod.GET,
      },
      {
        path: '/basic-details',
        method: RequestMethod.GET,
      },
      {
        path: '/logout',
        method: RequestMethod.POST,
      },
    );
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
