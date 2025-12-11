/**
 * Import TPG Collections Data
 *
 * This script imports the actual collections data with:
 * - Total Invoice Amount (original billed)
 * - Total Amount Collected (actual received after reduction)
 *
 * This gives us REAL collection rates showing the 40-60% reductions
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Simple CSV parser
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(str) {
  if (!str) return 0;
  let cleaned = str.replace('$', '').replace(/,/g, '').trim();
  if (cleaned.endsWith('.')) cleaned = cleaned.slice(0, -1);
  return parseFloat(cleaned) || 0;
}

async function importCollectionsData() {
  const client = await pool.connect();

  try {
    console.log('📂 Reading TPG Collections data...\n');

    const filePath = path.join(__dirname, '../../Data/TPG_Collections.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');

    // Find header row
    let headerIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Total Invoice Amount')) {
        headerIdx = i;
        break;
      }
    }

    const headers = parseCSVLine(lines[headerIdx]);
    console.log(`Found ${lines.length - headerIdx - 1} data rows\n`);

    // Aggregate by opportunity
    const opportunities = new Map();
    let totalInvoiced = 0;
    let totalCollected = 0;

    for (let i = headerIdx + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const opname = row['opname'];
      if (!opname) continue;

      const invoiceAmt = parseAmount(row['Total Invoice Amount']);
      const collectedAmt = parseAmount(row['Total Amount Collected']);

      if (invoiceAmt === 0) continue;

      totalInvoiced += invoiceAmt;
      totalCollected += collectedAmt;

      if (!opportunities.has(opname)) {
        opportunities.set(opname, {
          opname: opname,
          opid: row['opid'] || '',
          law_firm_name: row['law_firm_account_name__c'] || '',
          case_status: row['case_status__c'] || '',
          tranche_name: row['Tranche_Name'] || '',
          tranche_id: row['tranche'] || '',
          date_of_accident: row['date_of_accident__c'] || null,
          provider_name: row['paname'] || 'Therapy Partners Group - Parent',
          state: row['billingstate'] || '',
          funding_stage: row['funding_stage__c'] || '',
          payoff_status: row['payoff_status__c'] || '',
          ar_book_name: row['arbookname'] || '',
          ar_type: row['ar_type__c'] || '',
          origination_date: row['origination_date__c'] || null,
          invoice_amount: 0,
          collected_amount: 0,
          invoice_count: 0,
          first_deposit_date: null,
          first_invoice_date: null,
        });
      }

      const opp = opportunities.get(opname);
      opp.invoice_amount += invoiceAmt;
      opp.collected_amount += collectedAmt;
      opp.invoice_count += 1;

      // Track dates
      const depositDate = `${row['date_deposited_1__c - Year']}-${row['date_deposited_1__c - Month']}-${row['date_deposited_1__c - Day']}`;
      if (depositDate && depositDate !== '--') {
        if (!opp.first_deposit_date || depositDate < opp.first_deposit_date) {
          opp.first_deposit_date = depositDate;
        }
      }

      const invoiceDate = row['Invoice_Date'];
      if (invoiceDate) {
        if (!opp.first_invoice_date) {
          opp.first_invoice_date = invoiceDate;
        }
      }
    }

    console.log(`🔄 Aggregated into ${opportunities.size.toLocaleString()} opportunities\n`);
    console.log('💰 Financial Totals:');
    console.log(`   Total Invoiced: $${totalInvoiced.toLocaleString()}`);
    console.log(`   Total Collected: $${totalCollected.toLocaleString()}`);
    console.log(`   Collection Rate: ${(totalCollected / totalInvoiced * 100).toFixed(1)}%`);
    console.log(`   Reduction: ${((1 - totalCollected / totalInvoiced) * 100).toFixed(1)}%\n`);

    // Clear existing data and insert new
    console.log('🗑️  Clearing existing data...');
    await client.query('TRUNCATE TABLE provider_master_data RESTART IDENTITY');

    console.log('📥 Inserting opportunity data with REAL collection amounts...\n');

    let inserted = 0;
    for (const [opname, opp] of opportunities) {
      // Skip if no valid dates
      const invoiceDate = opp.first_invoice_date || opp.first_deposit_date;
      if (!invoiceDate) continue;

      const salesforceId = opp.opid || `OPP-${opname.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15)}`;

      try {
        await client.query(`
          INSERT INTO provider_master_data (
            salesforce_id, opportunity_name, opportunity_id,
            law_firm_name, case_status, tranche_name, tranche_id,
            date_of_accident, provider_name, provider_id, state,
            funding_stage, payoff_status, ar_book_name, ar_type,
            open_balance, collected_amount, write_off_amount, invoice_amount,
            invoice_date, origination_date, collection_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        `, [
          salesforceId,
          opname,
          opp.opid || salesforceId,
          opp.law_firm_name,
          opp.case_status,
          opp.tranche_name,
          opp.tranche_id,
          opp.date_of_accident || null,
          opp.provider_name || 'Therapy Partners Group - Parent',
          'TPG-001',
          opp.state,
          opp.funding_stage,
          opp.payoff_status,
          opp.ar_book_name,
          opp.ar_type,
          0, // open_balance = 0 for collected cases
          opp.collected_amount,
          opp.invoice_amount - opp.collected_amount, // write_off = reduction amount
          opp.invoice_amount,
          invoiceDate,
          opp.origination_date || null,
          opp.first_deposit_date || null,
        ]);
        inserted++;

        if (inserted % 100 === 0) {
          process.stdout.write(`   Inserted ${inserted} opportunities...\r`);
        }
      } catch (err) {
        console.error(`Error inserting ${opname}:`, err.message);
      }
    }

    console.log(`\n✅ Inserted ${inserted} collected opportunities\n`);

    // Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    const views = ['provider_kpi_summary_mv', 'law_firm_performance_mv', 'tranche_performance_mv'];

    for (const view of views) {
      try {
        const viewFile = path.join(__dirname, '../sql/views', `${view}.sql`);
        if (fs.existsSync(viewFile)) {
          const sql = fs.readFileSync(viewFile, 'utf8');
          await client.query(sql);
          console.log(`   ✅ ${view} recreated`);
        }
      } catch (err) {
        console.error(`   ❌ Error with ${view}:`, err.message);
      }
    }

    console.log('\n✅ Import complete!\n');

    // Verify
    const verify = await client.query(`
      SELECT
        COUNT(*) as total_records,
        SUM(invoice_amount) as total_invoiced,
        SUM(collected_amount) as total_collected,
        ROUND((SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100)::numeric, 1) as collection_rate
      FROM provider_master_data
    `);

    console.log('📊 Database Verification:');
    console.log(`   Total Records: ${verify.rows[0].total_records}`);
    console.log(`   Total Invoiced: $${parseFloat(verify.rows[0].total_invoiced).toLocaleString()}`);
    console.log(`   Total Collected: $${parseFloat(verify.rows[0].total_collected).toLocaleString()}`);
    console.log(`   Collection Rate: ${verify.rows[0].collection_rate}%`);

  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importCollectionsData();
