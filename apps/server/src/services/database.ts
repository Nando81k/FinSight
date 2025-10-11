import knex from 'knex';
import config from '../config/knexfile';

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

if (!dbConfig) {
  throw new Error(`Database configuration not found for environment: ${environment}`);
}

export const db = knex(dbConfig);