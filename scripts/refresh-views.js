/**
 * Refresh All Materialized Views Script
 *
 * Run this after data imports to update all dashboard metrics
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function refreshViews() {
  try {
    console.log('🔄 Refreshing all materialized views...\n');

    const result = await pool.query('SELECT * FROM refresh_all_materialized_views()');

    console.log('Refresh Results:');
    console.log('─'.repeat(80));
    console.log(`${'View Name'.padEnd(35)} ${'Status'.padEnd(25)} ${'Duration'}`);
    console.log('─'.repeat(80));

    result.rows.forEach(row => {
      const status = row.refresh_status === 'SUCCESS' ? '✅' : '❌';
      console.log(`${status} ${row.view_name.padEnd(33)} ${row.refresh_status.padEnd(23)} ${row.duration_ms}ms`);
    });

    console.log('─'.repeat(80));
    console.log('\n✨ All views refreshed successfully!\n');

  } catch (error) {
    console.error('❌ Error refreshing views:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

refreshViews();
