import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create factor_scores table for investment analysis
  await knex.schema.createTable('factor_scores', (table) => {
    table.increments('id').primary();
    table.string('symbol', 20).notNullable();
    table.string('kind', 20).notNullable(); // 'stock', 'etf'
    table.decimal('value_score', 5, 3); // 0-100 scale
    table.decimal('growth_score', 5, 3);
    table.decimal('quality_score', 5, 3);
    table.decimal('momentum_score', 5, 3);
    table.decimal('risk_score', 5, 3);
    table.decimal('beta', 8, 4);
    table.decimal('volatility', 8, 4);
    table.bigInteger('market_cap');
    table.decimal('pe_ratio', 8, 2);
    table.decimal('dividend_yield', 5, 3);
    table.timestamp('as_of').notNullable();
    table.timestamps(true, true);
    
    table.unique(['symbol', 'as_of']);
    table.index(['symbol']);
    table.index(['as_of']);
  });

  // Create user_sessions table for session management
  await knex.schema.createTable('user_sessions', (table) => {
    table.string('sid', 255).primary();
    table.jsonb('sess').notNullable();
    table.timestamp('expire').notNullable();
    
    table.index(['expire']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('factor_scores');
}