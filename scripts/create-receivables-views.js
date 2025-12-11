const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createViews() {
  console.log('🏗️  Creating PI-specific receivables materialized views...\n');

  const views = [
    'sql/views/receivables_by_case_status_mv.sql',
    'sql/views/settled_pending_detail_mv.sql',
    'sql/views/at_risk_ar_mv.sql',
  ];

  for (const viewFile of views) {
    console.log(`📄 Creating ${path.basename(viewFile)}...`);
    try {
      const sql = fs.readFileSync(viewFile, 'utf8');
      await pool.query(sql);
      console.log(`   ✅ Success!\n`);
    } catch (error) {
      console.error(`   ❌ Error:`, error.message || error, '\n');
      if (error.stack) console.error('   Stack:', error.stack);
    }
  }

  console.log('🔄 Refreshing all views...');
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY receivables_by_case_status_mv');
    console.log('   ✅ receivables_by_case_status_mv refreshed');
  } catch (error) {
    console.error('   ⚠️  Could not refresh receivables_by_case_status_mv:', error.message);
  }

  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY settled_pending_detail_mv');
    console.log('   ✅ settled_pending_detail_mv refreshed');
  } catch (error) {
    console.error('   ⚠️  Could not refresh settled_pending_detail_mv:', error.message);
  }

  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY at_risk_ar_mv');
    console.log('   ✅ at_risk_ar_mv refreshed');
  } catch (error) {
    console.error('   ⚠️  Could not refresh at_risk_ar_mv:', error.message);
  }

  console.log('\n✨ Done! PI-specific receivables views are ready.');
  await pool.end();
}

createViews().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
