import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DB_URL || 'postgres://postgres:postgres@localhost:5433/finsight',
      ssl: false,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: '../db/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: '../db/seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: '../db/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: '../db/seeds',
      extension: 'ts',
    },
  },
};

export default config;