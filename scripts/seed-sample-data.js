#!/usr/bin/env node

/**
 * Seed Sample Data for Testing
 *
 * Creates sample records to test the dashboard locally
 * Usage: node scripts/seed-sample-data.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Sample law firms
const lawFirms = [
  'BD&J, PC',
  'Silva Injury Law',
  'Setareh Law APLC',
  'Law Brothers',
  'Johnson & Associates',
];

// Sample case statuses
const statuses = [
  'Still Treating',
  'Gathering Bills',
  'Demand Sent',
  'Pending',
  'Negotiation',
  'In Litigation',
  'Settled - Pending',
  'Closed - Paid',
];

// Sample provider
const PROVIDER_ID = 'TPG001';
const PROVIDER_NAME = 'Therapy Partners Group';

// Generate random date within range
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate sample records
function generateSampleRecords(count) {
  const records = [];

  for (let i = 0; i < count; i++) {
    const invoiceAmount = Math.floor(Math.random() * 5000) + 500; // $500-$5500
    const collectedPercent = Math.random() * 0.6 + 0.2; // 20%-80%
    const collectedAmount = Math.floor(invoiceAmount * collectedPercent);
    const writeOffAmount = Math.random() < 0.1 ? Math.floor(Math.random() * 500) : 0;
    const openBalance = invoiceAmount - collectedAmount - writeOffAmount;

    const invoiceDate = randomDate(new Date(2023, 0, 1), new Date());
    const originationDate = new Date(invoiceDate.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);

    records.push({
      salesforce_id: `SF${String(i + 1).padStart(6, '0')}`,
      opportunity_id: `OPP${String(Math.floor(i / 3) + 1).padStart(6, '0')}`,
      opportunity_name: `Case ${Math.floor(i / 3) + 1} - Patient ${Math.floor(i / 3) + 1}`,
      patient_name: `Patient ${Math.floor(i / 3) + 1}`,
      law_firm_name: lawFirms[Math.floor(Math.random() * lawFirms.length)],
      provider_id: PROVIDER_ID,
      provider_name: PROVIDER_NAME,
      invoice_amount: invoiceAmount,
      collected_amount: collectedAmount,
      write_off_amount: writeOffAmount,
      open_balance: openBalance,
      invoice_date: invoiceDate.toISOString().split('T')[0],
      origination_date: originationDate.toISOString().split('T')[0],
      case_status: statuses[Math.floor(Math.random() * statuses.length)],
      funding_stage: 'Active',
    });
  }

  return records;
}

async function seedData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding sample data...');

    // Clear existing data
    console.log('  Clearing existing data...');
    await client.query('TRUNCATE TABLE provider_master_data CASCADE');

    // Generate and insert sample records
    const records = generateSampleRecords(500); // 500 sample invoices (~167 cases)
    console.log(`  Inserting ${records.length} sample records...`);

    for (const record of records) {
      await client.query(`
        INSERT INTO provider_master_data (
          salesforce_id, opportunity_id, opportunity_name, patient_name,
          law_firm_name, provider_id, provider_name,
          invoice_amount, collected_amount, write_off_amount, open_balance,
          invoice_date, origination_date, case_status, funding_stage,
          is_write_off
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        record.salesforce_id,
        record.opportunity_id,
        record.opportunity_name,
        record.patient_name,
        record.law_firm_name,
        record.provider_id,
        record.provider_name,
        record.invoice_amount,
        record.collected_amount,
        record.write_off_amount,
        record.open_balance,
        record.invoice_date,
        record.origination_date,
        record.case_status,
        record.funding_stage,
        record.write_off_amount > 0,
      ]);
    }

    console.log('  ✓ Sample records inserted');

    // Refresh materialized views
    console.log('  Refreshing materialized views...');
    await client.query('SELECT * FROM refresh_all_materialized_views()');
    console.log('  ✓ Materialized views refreshed');

    // Show summary
    const summary = await client.query(`
      SELECT
        COUNT(*) as total_invoices,
        COUNT(DISTINCT opportunity_name) as total_cases,
        SUM(invoice_amount) as total_invoiced,
        SUM(collected_amount) as total_collected,
        SUM(open_balance) as total_open
      FROM provider_master_data
    `);

    console.log('');
    console.log('✅ Sample data seeded successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  Total Invoices: ${summary.rows[0].total_invoices}`);
    console.log(`  Total Cases: ${summary.rows[0].total_cases}`);
    console.log(`  Total Invoiced: $${Number(summary.rows[0].total_invoiced).toLocaleString()}`);
    console.log(`  Total Collected: $${Number(summary.rows[0].total_collected).toLocaleString()}`);
    console.log(`  Total Open: $${Number(summary.rows[0].total_open).toLocaleString()}`);
    console.log('');
    console.log('🚀 Run "npm run dev" and visit http://localhost:3000');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();
