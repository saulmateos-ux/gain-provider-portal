/**
 * Update Collection Rate Formula
 *
 * Recreates all materialized views with the corrected collection rate formula:
 * Collection Rate = Collected / Invoice Amount (for invoices with collections only)
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function updateViews() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting materialized view updates...\n');

    // List of views to recreate in order
    const views = [
      'provider_kpi_summary_mv',
      'law_firm_performance_mv',
      'tranche_performance_mv',
    ];

    for (const view of views) {
      const viewFile = path.join(__dirname, '../sql/views', `${view}.sql`);

      if (fs.existsSync(viewFile)) {
        console.log(`📝 Recreating ${view}...`);
        const sql = fs.readFileSync(viewFile, 'utf8');
        await client.query(sql);
        console.log(`✅ ${view} recreated successfully\n`);
      } else {
        console.log(`⚠️  Warning: ${viewFile} not found, skipping\n`);
      }
    }

    console.log('✅ All materialized views updated successfully!');
    console.log('\n📊 Collection rate now calculated as:');
    console.log('   Collected Amount / Invoice Amount');
    console.log('   (for invoices with collections only)\n');

  } catch (error) {
    console.error('❌ Error updating views:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateViews();
