const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createViews() {
  console.log('🏗️  Creating PI-specific law firm materialized views...\n');

  const views = [
    'sql/views/law_firm_pi_performance_mv.sql',
    'sql/views/law_firm_monthly_trends_mv.sql',
    'sql/views/law_firm_case_pipeline_mv.sql',
    'sql/views/law_firm_risk_analysis_mv.sql',
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

  console.log('🔄 Refreshing all law firm views...');

  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY law_firm_pi_performance_mv');
    console.log('   ✅ law_firm_pi_performance_mv refreshed');
  } catch (error) {
    console.error('   ⚠️  Could not refresh law_firm_pi_performance_mv:', error.message);
  }

  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY law_firm_monthly_trends_mv');
    console.log('   ✅ law_firm_monthly_trends_mv refreshed');
  } catch (error) {
    console.error('   ⚠️  Could not refresh law_firm_monthly_trends_mv:', error.message);
  }

  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY law_firm_case_pipeline_mv');
    console.log('   ✅ law_firm_case_pipeline_mv refreshed');
  } catch (error) {
    console.error('   ⚠️  Could not refresh law_firm_case_pipeline_mv:', error.message);
  }

  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY law_firm_risk_analysis_mv');
    console.log('   ✅ law_firm_risk_analysis_mv refreshed');
  } catch (error) {
    console.error('   ⚠️  Could not refresh law_firm_risk_analysis_mv:', error.message);
  }

  console.log('\n✨ Done! PI-specific law firm views are ready.');
  await pool.end();
}

createViews().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
