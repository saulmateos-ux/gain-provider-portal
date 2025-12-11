#!/usr/bin/env node

/**
 * Import Therapy Partners Group Data
 *
 * Imports the TPG_Invoice.csv file from the Data directory
 * Maps columns from Salesforce export to our database schema
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Column mapping from Salesforce to our schema
const COLUMN_MAP = {
  fid: 'funding_id',
  fname: 'patient_name',
  opname: 'opportunity_name',
  opid: 'opportunity_id',
  date_of_accident__c: 'date_of_accident',
  law_firm_account_name__c: 'law_firm_name',
  attorneyname: 'attorney_name',
  paid: 'provider_id',
  paname: 'provider_name',
  medlocale: 'location_id',
  mfname: 'location_name',
  billingstate: 'state',
  'Open Invoice': 'open_invoice',
  Settled: 'settled',
  'Write Off': 'write_off',
  Invoice_Date: 'invoice_date',
  origination_date__c: 'origination_date',
  cap_date__c: 'cap_date',
  funding_stage__c: 'funding_stage',
  case_status__c: 'case_status',
  payoff_status__c: 'payoff_status',
  IsWriteOff: 'is_write_off',
  cap_writeoff_reason__c: 'write_off_reason',
  Tranche_Name: 'tranche_name',
  ar_book__c: 'ar_book_id',
  arbookname: 'ar_book_name',
  ar_type__c: 'ar_type',
};

function parseDecimal(value) {
  if (!value || value === '') return 0;
  const cleaned = String(value).replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;

  // Handle M/D/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      const isoDate = `${year}-${month}-${day}`;
      const date = new Date(isoDate);
      return isNaN(date.getTime()) ? null : isoDate;
    }
  }

  // Handle ISO format
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
}

async function importTPGData() {
  const client = await pool.connect();

  try {
    // Find the CSV file
    const csvPath = path.join(__dirname, '../../Data/TPG_Invoice.csv');

    if (!fs.existsSync(csvPath)) {
      console.error('❌ File not found:', csvPath);
      console.log('   Looking for: ../Data/TPG_Invoice.csv');
      process.exit(1);
    }

    console.log('📂 Reading CSV file:', csvPath);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('📊 Parsing CSV...');

    // Skip the first 7 lines (filter info and extra headers)
    const lines = csvContent.split('\n');
    const dataLines = lines.slice(7).join('\n'); // Skip first 7 lines

    const parsed = Papa.parse(dataLines, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    // Filter out header rows and invalid rows
    const validRows = parsed.data.filter(row => {
      // Skip if this looks like a header row
      if (row.fid && row.fid.includes('fid')) return false;
      // Skip if no funding ID
      if (!row.fid || row.fid.trim() === '') return false;
      // Skip if fid looks like it's still a header
      if (row.fid.toLowerCase().includes('year') || row.fid.toLowerCase().includes('invoice')) return false;
      return true;
    });

    console.log(`✓ Found ${validRows.length} valid records`);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await client.query('TRUNCATE TABLE provider_master_data CASCADE');

    // Import data
    console.log('📥 Importing records...');
    let imported = 0;
    let skipped = 0;

    for (const row of validRows) {
      try {
        // Calculate amounts
        const openInvoice = parseDecimal(row['Open Invoice']);
        const settled = parseDecimal(row['Settled']);
        const writeOff = parseDecimal(row['Write Off']);
        const invoiceAmount = openInvoice + settled + writeOff;
        const collectedAmount = settled;
        const writeOffAmount = writeOff;
        const openBalance = openInvoice;

        await client.query(`
          INSERT INTO provider_master_data (
            salesforce_id, funding_id,
            patient_name,
            opportunity_id, opportunity_name, date_of_accident,
            law_firm_name, attorney_name,
            provider_id, provider_name,
            location_id, location_name, state,
            invoice_amount, collected_amount, write_off_amount, open_balance,
            invoice_date, origination_date, cap_date,
            funding_stage, case_status, payoff_status,
            is_write_off, write_off_reason,
            tranche_name, ar_book_id, ar_book_name, ar_type
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29
          )
        `, [
          row.opid || row.fid,  // salesforce_id
          row.fid,  // funding_id
          row.fname || null,  // patient_name
          row.opid,  // opportunity_id
          row.opname,  // opportunity_name
          parseDate(row.date_of_accident__c),  // date_of_accident
          row.law_firm_account_name__c || null,  // law_firm_name
          row.attorneyname || null,  // attorney_name
          row.paid,  // provider_id
          row.paname,  // provider_name
          row.medlocale || null,  // location_id
          row.mfname || null,  // location_name
          row.billingstate || null,  // state
          invoiceAmount,  // invoice_amount
          collectedAmount,  // collected_amount
          writeOffAmount,  // write_off_amount
          openBalance,  // open_balance
          parseDate(row.Invoice_Date || row.Invoice_Date2),  // invoice_date
          parseDate(row.origination_date__c),  // origination_date
          parseDate(row.cap_date__c),  // cap_date
          row.funding_stage__c || null,  // funding_stage
          row.case_status__c || null,  // case_status
          row.payoff_status__c || null,  // payoff_status
          parseBoolean(row.IsWriteOff),  // is_write_off
          row.cap_writeoff_reason__c || null,  // write_off_reason
          row.Tranche_Name || null,  // tranche_name
          row.ar_book__c || null,  // ar_book_id
          row.arbookname || null,  // ar_book_name
          row.ar_type__c || null,  // ar_type
        ]);

        imported++;
        if (imported % 100 === 0) {
          process.stdout.write(`\r  Imported: ${imported}/${validRows.length}`);
        }
      } catch (error) {
        skipped++;
        // console.error(`  Warning: Skipped row ${imported + skipped}:`, error.message);
      }
    }

    console.log(`\n✓ Imported ${imported} records (${skipped} skipped)`);

    // Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    await client.query('SELECT * FROM refresh_all_materialized_views()');
    console.log('✓ Materialized views refreshed');

    // Show summary
    const summary = await client.query(`
      SELECT
        COUNT(*) as total_invoices,
        COUNT(DISTINCT opportunity_name) as total_cases,
        COUNT(DISTINCT law_firm_name) FILTER (WHERE law_firm_name IS NOT NULL) as law_firms,
        SUM(invoice_amount) as total_invoiced,
        SUM(collected_amount) as total_collected,
        SUM(open_balance) as total_open
      FROM provider_master_data
    `);

    console.log('');
    console.log('✅ Therapy Partners data imported successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  Total Invoices: ${summary.rows[0].total_invoices}`);
    console.log(`  Total Cases: ${summary.rows[0].total_cases}`);
    console.log(`  Law Firms: ${summary.rows[0].law_firms}`);
    console.log(`  Total Invoiced: $${Number(summary.rows[0].total_invoiced).toLocaleString()}`);
    console.log(`  Total Collected: $${Number(summary.rows[0].total_collected).toLocaleString()}`);
    console.log(`  Total Open: $${Number(summary.rows[0].total_open).toLocaleString()}`);
    console.log('');
    console.log('🚀 Run "npm run dev" and visit http://localhost:3000');

  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importTPGData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
