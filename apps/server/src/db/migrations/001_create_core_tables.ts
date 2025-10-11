import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.timestamps(true, true);
  });

  // Create external_accounts table
  await knex.schema.createTable('external_accounts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('provider', 50).notNullable(); // 'robinhood', 'coinbase'
    table.string('auth_type', 50).notNullable(); // 'csv', 'api'
    table.string('masked_id', 100); // Last 4 digits or masked identifier
    table.text('encrypted_credentials'); // Encrypted API keys/tokens
    table.timestamp('last_sync_at');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.unique(['user_id', 'provider']);
  });

  // Create positions table
  await knex.schema.createTable('positions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('external_account_id').references('id').inTable('external_accounts').onDelete('CASCADE');
    table.string('symbol', 20).notNullable();
    table.string('name', 255);
    table.string('asset_type', 20).notNullable(); // 'stock', 'crypto', 'etf'
    table.decimal('quantity', 20, 8).notNullable();
    table.decimal('avg_cost', 20, 8);
    table.decimal('cost_basis', 20, 2);
    table.string('source', 50).notNullable(); // 'robinhood', 'coinbase'
    table.timestamps(true, true);
    
    table.index(['user_id', 'symbol']);
    table.index(['asset_type']);
  });

  // Create transactions table
  await knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('external_account_id').references('id').inTable('external_accounts').onDelete('CASCADE');
    table.date('trade_date').notNullable();
    table.string('symbol', 20).notNullable();
    table.string('side', 10).notNullable(); // 'buy', 'sell'
    table.decimal('quantity', 20, 8).notNullable();
    table.decimal('price', 20, 8).notNullable();
    table.decimal('fees', 10, 4).defaultTo(0);
    table.string('source', 50).notNullable();
    table.jsonb('raw_data'); // Store original CSV/API data
    table.timestamps(true, true);
    
    table.index(['user_id', 'symbol']);
    table.index(['trade_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transactions');
  await knex.schema.dropTableIfExists('positions');
  await knex.schema.dropTableIfExists('external_accounts');
  await knex.schema.dropTableIfExists('users');
}