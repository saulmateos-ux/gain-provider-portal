/**
 * Fix Law Firms Materialized View for Real Data
 */

const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_WGcTRM9Oefd8@ep-withered-violet-a47xek4z-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixView() {
  console.log('🔧 Fixing law_firm_performance_mv...\n');

  try {
    const sql = fs.readFileSync('sql/views/law_firm_performance_mv_fixed.sql', 'utf8');

    console.log('📊 Recreating materialized view...');
    await pool.query(sql);
    console.log('   ✅ View recreated\n');

    // Check data
    const result = await pool.query('SELECT COUNT(*) as count FROM law_firm_performance_mv');
    console.log(`📈 Law firms in view: ${result.rows[0].count}`);

    const top5 = await pool.query(`
      SELECT law_firm_name, case_count, total_invoice, collection_rate
      FROM law_firm_performance_mv
      ORDER BY total_invoice DESC
      LIMIT 5
    `);

    console.log('\n🏆 Top 5 Law Firms by Total Invoice:');
    top5.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.law_firm_name}`);
      console.log(`      Cases: ${row.case_count}, Invoice: $${parseFloat(row.total_invoice).toLocaleString()}, Rate: ${row.collection_rate}%`);
    });

    console.log('\n✅ Law firms view fixed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixView();
