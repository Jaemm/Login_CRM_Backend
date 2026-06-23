import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

export function buildBullQueueOptions(configService: ConfigService): BullRootModuleOptions {
  const redisUrl = configService.get<string>('REDIS_URL');

  if (redisUrl) {
    const url = new URL(redisUrl);
    const db = url.pathname ? Number(url.pathname.replace('/', '')) : 0;

    return {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        username: url.username || undefined,
        password: url.password || undefined,
        db: Number.isNaN(db) ? 0 : db,
        tls: url.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      },
    };
  }

  const password = configService.get<string>('REDIS_PASSWORD');

  return {
    connection: {
      host: configService.get<string>('REDIS_HOST') || '127.0.0.1',
      port: Number(configService.get<string>('REDIS_PORT') || 6379),
      password: password || undefined,
      db: Number(configService.get<string>('REDIS_DB') || 0),
      maxRetriesPerRequest: null,
    },
  };
}
