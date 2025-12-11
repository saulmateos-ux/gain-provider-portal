/**
 * Check Database Current State
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WGcTRM9Oefd8@ep-withered-violet-a47xek4z-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('=== DATABASE CURRENT STATE ===\n');

    // Total records and open balance
    const total = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        SUM(invoice_amount) as total_invoice,
        SUM(collected_amount) as total_collected,
        SUM(open_balance) as total_open,
        COUNT(*) FILTER (WHERE open_balance > 0) as records_with_open_balance
      FROM provider_master_data
    `);

    console.log('Total Records:', total.rows[0].total_records);
    console.log('Total Invoice:', '$' + parseFloat(total.rows[0].total_invoice || 0).toLocaleString());
    console.log('Total Collected:', '$' + parseFloat(total.rows[0].total_collected || 0).toLocaleString());
    console.log('Total Open Balance:', '$' + parseFloat(total.rows[0].total_open || 0).toLocaleString());
    console.log('Records with Open Balance:', total.rows[0].records_with_open_balance);
    console.log();

    // By case status
    const byStatus = await pool.query(`
      SELECT
        case_status,
        COUNT(*) as count,
        SUM(open_balance) as total_open_balance
      FROM provider_master_data
      WHERE open_balance > 0
      GROUP BY case_status
      ORDER BY total_open_balance DESC
    `);

    console.log('=== OPEN AR BY CASE STATUS ===\n');
    byStatus.rows.forEach(row => {
      console.log(row.case_status + ':', row.count, 'invoices,', '$' + parseFloat(row.total_open_balance).toLocaleString());
    });
    console.log();

    // Check materialized view
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
        at_risk_cases
      FROM receivables_by_case_status_mv
      WHERE provider_name = 'Therapy Partners Group - Parent'
    `);

    console.log('=== MATERIALIZED VIEW DATA ===\n');
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
