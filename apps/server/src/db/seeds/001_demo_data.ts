import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries
  await knex('budget_allocations').del();
  await knex('budget_categories').del();
  await knex('salary_profiles').del();
  await knex('transactions').del();
  await knex('positions').del();
  await knex('external_accounts').del();
  await knex('users').del();

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const [userId] = await knex('users').insert({
    email: 'demo@finsight.com',
    password_hash: hashedPassword,
    first_name: 'Demo',
    last_name: 'User',
  }).returning('id');

  // Create external accounts
  const [robinhoodAccountId] = await knex('external_accounts').insert({
    user_id: userId.id,
    provider: 'robinhood',
    auth_type: 'csv',
    masked_id: '****1234',
    is_active: true,
  }).returning('id');

  const [coinbaseAccountId] = await knex('external_accounts').insert({
    user_id: userId.id,
    provider: 'coinbase',
    auth_type: 'api',
    masked_id: '****5678',
    is_active: true,
  }).returning('id');

  // Create sample positions
  await knex('positions').insert([
    {
      user_id: userId.id,
      external_account_id: robinhoodAccountId.id,
      symbol: 'AAPL',
      name: 'Apple Inc.',
      asset_type: 'stock',
      quantity: 50.0,
      avg_cost: 180.25,
      cost_basis: 9012.50,
      source: 'robinhood',
    },
    {
      user_id: userId.id,
      external_account_id: robinhoodAccountId.id,
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      asset_type: 'etf',
      quantity: 25.0,
      avg_cost: 400.00,
      cost_basis: 10000.00,
      source: 'robinhood',
    },
    {
      user_id: userId.id,
      external_account_id: coinbaseAccountId.id,
      symbol: 'BTC',
      name: 'Bitcoin',
      asset_type: 'crypto',
      quantity: 0.25,
      avg_cost: 45000.00,
      cost_basis: 11250.00,
      source: 'coinbase',
    },
    {
      user_id: userId.id,
      external_account_id: coinbaseAccountId.id,
      symbol: 'ETH',
      name: 'Ethereum',
      asset_type: 'crypto',
      quantity: 2.0,
      avg_cost: 2500.00,
      cost_basis: 5000.00,
      source: 'coinbase',
    },
  ]);

  // Create sample salary profile
  const [salaryProfileId] = await knex('salary_profiles').insert({
    user_id: userId.id,
    tax_year: 2025,
    annual_salary: 120000.00,
    state: 'CA',
    city: 'San Francisco',
    filing_status: 'single',
    dependents: 0,
    retirement_pct: 15.00,
    hsa_contribution: 3650.00,
    pay_frequency: 'biweekly',
  }).returning('id');

  // Create budget categories
  const categoryInserts = [
    { name: 'Housing', color: '#EF4444', is_essential: true, sort_order: 1 },
    { name: 'Food & Dining', color: '#F97316', is_essential: true, sort_order: 2 },
    { name: 'Transportation', color: '#EAB308', is_essential: true, sort_order: 3 },
    { name: 'Healthcare', color: '#22C55E', is_essential: true, sort_order: 4 },
    { name: 'Investing', color: '#3B82F6', is_essential: false, sort_order: 5 },
    { name: 'Entertainment', color: '#8B5CF6', is_essential: false, sort_order: 6 },
    { name: 'Shopping', color: '#EC4899', is_essential: false, sort_order: 7 },
    { name: 'Emergency Fund', color: '#6B7280', is_essential: false, sort_order: 8 },
  ];

  const categoryIds = await knex('budget_categories').insert(
    categoryInserts.map(cat => ({ ...cat, user_id: userId.id }))
  ).returning('id');

  // Create budget allocations
  const budgetAllocations = [
    { category_id: categoryIds[0]?.id, amount_monthly: 2500.00 }, // Housing
    { category_id: categoryIds[1]?.id, amount_monthly: 800.00 },  // Food
    { category_id: categoryIds[2]?.id, amount_monthly: 300.00 },  // Transportation
    { category_id: categoryIds[3]?.id, amount_monthly: 200.00 },  // Healthcare
    { category_id: categoryIds[4]?.id, amount_monthly: 1500.00 }, // Investing
    { category_id: categoryIds[5]?.id, amount_monthly: 300.00 },  // Entertainment
    { category_id: categoryIds[6]?.id, amount_monthly: 200.00 },  // Shopping
    { category_id: categoryIds[7]?.id, amount_monthly: 500.00 },  // Emergency
  ];

  await knex('budget_allocations').insert(
    budgetAllocations.map(alloc => ({
      ...alloc,
      user_id: userId.id,
      salary_profile_id: salaryProfileId.id,
      scenario_name: 'Default',
    }))
  );

  console.log('[SUCCESS] Seed data inserted successfully');
}