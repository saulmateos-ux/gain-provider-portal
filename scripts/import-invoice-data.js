/**
 * Import TPG Invoice Data
 *
 * This script imports the granular invoice-level data from TPG_Invoice.csv
 * and aggregates it by opportunity to get accurate collection rates.
 *
 * Key difference from previous import:
 * - Previous import: Used opportunity-level data where collections were all-or-nothing
 * - This import: Uses invoice-level data aggregated by opportunity for real collection rates
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
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const record = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });
    records.push(record);
  }
  return records;
}

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

async function importInvoiceData() {
  const client = await pool.connect();

  try {
    console.log('📂 Reading TPG Invoice data...\n');

    const filePath = path.join(__dirname, '../../Data/TPG_Invoice.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Find the header row (skip filter metadata at top)
    const lines = fileContent.split('\n');
    let headerIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Invoice_Date2 - Year')) {
        headerIdx = i;
        break;
      }
    }

    // Parse CSV from header row
    const csvContent = lines.slice(headerIdx).join('\n');
    const records = parseCSV(csvContent);

    console.log(`📊 Parsed ${records.length.toLocaleString()} invoice records\n`);

    // Aggregate by opportunity
    const opportunities = new Map();

    for (const row of records) {
      const opname = row['opname'] || 'Unknown';
      const opid = row['opid'] || '';

      if (!opname || opname === 'Unknown') continue;

      const openInv = parseFloat(row['Open Invoice'] || 0);
      const settled = parseFloat(row['Settled'] || 0);
      const writeOff = parseFloat(row['Write Off'] || 0);

      if (openInv === 0 && settled === 0 && writeOff === 0) continue;

      if (!opportunities.has(opname)) {
        opportunities.set(opname, {
          opid: opid,
          opname: opname,
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
          // Financial aggregates
          open_balance: 0,
          collected_amount: 0,
          write_off_amount: 0,
          invoice_amount: 0,
          invoice_count: 0,
          // Track first/last invoice dates
          first_invoice_date: null,
          last_invoice_date: null,
          origination_date: row['origination_date__c'] || null,
        });
      }

      const opp = opportunities.get(opname);
      opp.open_balance += openInv;
      opp.collected_amount += settled;
      opp.write_off_amount += writeOff;
      opp.invoice_amount += (openInv + settled + writeOff);
      opp.invoice_count += 1;

      // Track invoice dates
      const invoiceDate = row['Invoice_Date'] || row['createddate'];
      if (invoiceDate) {
        if (!opp.first_invoice_date || invoiceDate < opp.first_invoice_date) {
          opp.first_invoice_date = invoiceDate;
        }
        if (!opp.last_invoice_date || invoiceDate > opp.last_invoice_date) {
          opp.last_invoice_date = invoiceDate;
        }
      }
    }

    console.log(`🔄 Aggregated into ${opportunities.size.toLocaleString()} opportunities\n`);

    // Calculate stats
    let totalOpen = 0, totalCollected = 0, totalWriteOff = 0;
    let partialCollections = 0, fullCollections = 0, noCollections = 0;

    for (const [, opp] of opportunities) {
      totalOpen += opp.open_balance;
      totalCollected += opp.collected_amount;
      totalWriteOff += opp.write_off_amount;

      if (opp.collected_amount > 0 && opp.open_balance > 0) {
        partialCollections++;
      } else if (opp.collected_amount > 0) {
        fullCollections++;
      } else {
        noCollections++;
      }
    }

    console.log('📈 Collection Distribution:');
    console.log(`   Full collections (100%): ${fullCollections}`);
    console.log(`   Partial collections: ${partialCollections}`);
    console.log(`   No collections yet: ${noCollections}`);
    console.log(`\n💰 Financial Totals:`);
    console.log(`   Total Invoiced: $${(totalOpen + totalCollected + totalWriteOff).toLocaleString()}`);
    console.log(`   Total Collected: $${totalCollected.toLocaleString()}`);
    console.log(`   Total Open: $${totalOpen.toLocaleString()}`);
    console.log(`   Total Write-off: $${totalWriteOff.toLocaleString()}`);
    console.log(`   Collection Rate: ${((totalCollected / (totalCollected + totalOpen)) * 100).toFixed(1)}%\n`);

    // Clear existing data and insert new
    console.log('🗑️  Clearing existing data...');
    await client.query('TRUNCATE TABLE provider_master_data RESTART IDENTITY');

    console.log('📥 Inserting aggregated opportunity data...\n');

    let inserted = 0;
    let skipped = 0;
    for (const [opname, opp] of opportunities) {
      // Skip if no valid invoice date
      if (!opp.first_invoice_date) {
        skipped++;
        continue;
      }

      // Generate a salesforce_id from opportunity ID or name
      const salesforceId = opp.opid || `OPP-${opname.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15)}`;

      try {
        await client.query(`
          INSERT INTO provider_master_data (
            salesforce_id, opportunity_name, opportunity_id,
            law_firm_name, case_status, tranche_name, tranche_id,
            date_of_accident, provider_name, provider_id, state,
            funding_stage, payoff_status, ar_book_name, ar_type,
            open_balance, collected_amount, write_off_amount, invoice_amount,
            invoice_date, origination_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
          'TPG-001', // Provider ID
          opp.state,
          opp.funding_stage,
          opp.payoff_status,
          opp.ar_book_name,
          opp.ar_type,
          opp.open_balance,
          opp.collected_amount,
          opp.write_off_amount,
          opp.invoice_amount,
          opp.first_invoice_date,
          opp.origination_date || null,
        ]);
        inserted++;

        if (inserted % 200 === 0) {
          process.stdout.write(`   Inserted ${inserted} opportunities...\r`);
        }
      } catch (err) {
        console.error(`Error inserting ${opname}:`, err.message);
      }
    }

    console.log(`\n✅ Inserted ${inserted} opportunities (skipped ${skipped} without dates)\n`);

    // Refresh materialized views
    console.log('🔄 Refreshing materialized views...');

    const views = [
      'provider_kpi_summary_mv',
      'law_firm_performance_mv',
      'tranche_performance_mv',
    ];

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

    // Verify the data
    const verify = await client.query(`
      SELECT
        COUNT(*) as total_records,
        SUM(invoice_amount) as total_invoiced,
        SUM(collected_amount) as total_collected,
        SUM(open_balance) as total_open,
        COUNT(*) FILTER (WHERE collected_amount > 0 AND open_balance > 0) as partial_collections,
        ROUND(
          CASE
            WHEN SUM(CASE WHEN collected_amount > 0 THEN invoice_amount ELSE 0 END) > 0
            THEN (SUM(CASE WHEN collected_amount > 0 THEN collected_amount ELSE 0 END) /
                  SUM(CASE WHEN collected_amount > 0 THEN invoice_amount ELSE 0 END) * 100)
            ELSE 0
          END,
        2) as collection_rate
      FROM provider_master_data
    `);

    console.log('📊 Database Verification:');
    console.log(`   Total Records: ${verify.rows[0].total_records}`);
    console.log(`   Total Invoiced: $${parseFloat(verify.rows[0].total_invoiced).toLocaleString()}`);
    console.log(`   Total Collected: $${parseFloat(verify.rows[0].total_collected).toLocaleString()}`);
    console.log(`   Total Open: $${parseFloat(verify.rows[0].total_open).toLocaleString()}`);
    console.log(`   Partial Collections: ${verify.rows[0].partial_collections}`);
    console.log(`   Collection Rate: ${verify.rows[0].collection_rate}%`);

  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importInvoiceData();
