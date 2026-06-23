import { registerAs } from '@nestjs/config';
import { config } from 'dotenv';

config();

type DBConfigOptions = {
  host: string;
  port: string;
  username: string;
  password: string;
  database: string;
  isAnalysis?: boolean;
};

const commonSettings = {
  synchronize: false,
  logging: false,
  autoLoadEntities: true,
  migrations: ['dist/migrations/*{.ts,.js}'],
};

const buildDBConfig = (options: DBConfigOptions) => ({
  type: 'postgres',
  host: options.host,
  port: Number(options.port),
  username: options.username,
  password: options.password,
  database: options.database,

  ssl: {
    rejectUnauthorized: false,
  },

  entities: options.isAnalysis
    ? ['dist/**/analysisEntities/*.entity{.ts,.js}']
    : ['dist/**/*.entity{.ts,.js}'],
  ...commonSettings,
});

const getEnv = (key: string) => process.env[key] || '';

export const globalDB = registerAs('globalDB', () =>
  buildDBConfig({
    host: getEnv('POSTGRES_HOST'),
    port: getEnv('POSTGRES_PORT'),
    username: getEnv('POSTGRES_USER'),
    password: getEnv('POSTGRES_PASSWORD'),
    database: getEnv('POSTGRES_DB'),
  }),
);

export const cndpSkinDB = registerAs('cndpSkinDB', () =>
  buildDBConfig({
    host: getEnv('POSTGRES_HOST'),
    port: getEnv('POSTGRES_PORT'),
    username: getEnv('POSTGRES_USER'),
    password: getEnv('POSTGRES_PASSWORD'),
    database: getEnv('CNDP_SKIN'),
    isAnalysis: true,
  }),
);

export const cmaHairDB = registerAs('cmaHairDB', () =>
  buildDBConfig({
    host: getEnv('POSTGRES_HOST'),
    port: getEnv('POSTGRES_PORT'),
    username: getEnv('POSTGRES_USER'),
    password: getEnv('POSTGRES_PASSWORD'),
    database: getEnv('CMA_HAIR'),
    isAnalysis: true,
  }),
);

export const cmaSkinDB = registerAs('cmaSkinDB', () =>
  buildDBConfig({
    host: getEnv('POSTGRES_HOST'),
    port: getEnv('POSTGRES_PORT'),
    username: getEnv('POSTGRES_USER'),
    password: getEnv('POSTGRES_PASSWORD'),
    database: getEnv('CMA_SKIN'),
    isAnalysis: true,
  }),
);

export const cndpHairDB = registerAs('cndpHairDB', () =>
  buildDBConfig({
    host: getEnv('POSTGRES_HOST'),
    port: getEnv('POSTGRES_PORT'),
    username: getEnv('POSTGRES_USER'),
    password: getEnv('POSTGRES_PASSWORD'),
    database: getEnv('CNDP_HAIR'),
    isAnalysis: true,
  }),
);
