/**
 * Manually Refresh All Materialized Views
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WGcTRM9Oefd8@ep-withered-violet-a47xek4z-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('🔄 Refreshing all materialized views...\n');

    // Call the refresh function
    await pool.query('SELECT * FROM refresh_all_materialized_views()');
    console.log('   ✅ All views refreshed successfully!\n');

    // Verify the refresh
    const mv = await pool.query(`
      SELECT
        provider_name,
        total_open_ar,
        total_open_cases,
        settled_pending_ar,
        settled_pending_cases,
        in_litigation_ar,
        in_litigation_cases,
        active_litigation_ar,
        active_litigation_cases,
        at_risk_ar,
        at_risk_cases,
        calculated_at
      FROM receivables_by_case_status_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
    `);

    console.log('=== MATERIALIZED VIEW DATA (AFTER REFRESH) ===\n');
    if (mv.rows.length > 0) {
      const data = mv.rows[0];
      console.log('Total Open AR:', '$' + parseFloat(data.total_open_ar || 0).toLocaleString());
      console.log('Total Open Cases:', data.total_open_cases);
      console.log('Settled Pending AR:', '$' + parseFloat(data.settled_pending_ar || 0).toLocaleString());
      console.log('Settled Pending Cases:', data.settled_pending_cases);
      console.log('In Litigation AR:', '$' + parseFloat(data.in_litigation_ar || 0).toLocaleString());
      console.log('In Litigation Cases:', data.in_litigation_cases);
      console.log('Active Litigation AR:', '$' + parseFloat(data.active_litigation_ar || 0).toLocaleString());
      console.log('Active Litigation Cases:', data.active_litigation_cases);
      console.log('At Risk AR:', '$' + parseFloat(data.at_risk_ar || 0).toLocaleString());
      console.log('At Risk Cases:', data.at_risk_cases);
      console.log('Calculated At:', data.calculated_at);
    } else {
      console.log('NO DATA FOUND!');
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
})();
