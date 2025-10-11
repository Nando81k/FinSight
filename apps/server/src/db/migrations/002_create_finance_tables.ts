import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create prices table
  await knex.schema.createTable('prices', (table) => {
    table.increments('id').primary();
    table.string('symbol', 20).notNullable();
    table.string('asset_type', 20).notNullable(); // 'stock', 'crypto', 'etf'
    table.decimal('price', 20, 8).notNullable();
    table.decimal('open', 20, 8);
    table.decimal('high', 20, 8);
    table.decimal('low', 20, 8);
    table.decimal('volume', 20, 2);
    table.decimal('market_cap', 20, 2);
    table.timestamp('as_of').notNullable();
    table.timestamps(true, true);
    
    table.unique(['symbol', 'as_of']);
    table.index(['symbol']);
    table.index(['asset_type']);
    table.index(['as_of']);
  });

  // Create salary_profiles table
  await knex.schema.createTable('salary_profiles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('tax_year').notNullable();
    table.decimal('annual_salary', 12, 2).notNullable();
    table.string('state', 2).notNullable(); // US state code
    table.string('city', 100);
    table.string('filing_status', 20).notNullable(); // 'single', 'married_jointly', etc.
    table.integer('dependents').defaultTo(0);
    table.decimal('retirement_pct', 5, 2).defaultTo(0); // 401k percentage
    table.decimal('hsa_contribution', 10, 2).defaultTo(0);
    table.decimal('fsa_contribution', 10, 2).defaultTo(0);
    table.string('pay_frequency', 20).notNullable(); // 'weekly', 'biweekly', etc.
    table.decimal('additional_withholding', 10, 2).defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['user_id', 'tax_year']);
  });

  // Create budget_categories table
  await knex.schema.createTable('budget_categories', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('color', 7).defaultTo('#3B82F6'); // Hex color
    table.boolean('is_essential').defaultTo(false);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
    
    table.unique(['user_id', 'name']);
  });

  // Create budget_allocations table
  await knex.schema.createTable('budget_allocations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('salary_profile_id').references('id').inTable('salary_profiles').onDelete('CASCADE');
    table.integer('category_id').references('id').inTable('budget_categories').onDelete('CASCADE');
    table.decimal('amount_monthly', 10, 2).notNullable();
    table.string('scenario_name', 100).defaultTo('Default');
    table.timestamps(true, true);
    
    table.index(['user_id', 'salary_profile_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('budget_allocations');
  await knex.schema.dropTableIfExists('budget_categories');
  await knex.schema.dropTableIfExists('salary_profiles');
  await knex.schema.dropTableIfExists('prices');
}