/**
 * Combined Import: TPG Invoice + Collections Data
 *
 * This script imports BOTH datasets:
 * - TPG_Invoice.csv: Open invoices (receivables with open_balance)
 * - TPG_Collections.csv: Collected invoices (with collection_date)
 *
 * The combined data gives us:
 * - Real collection rates
 * - Actual collection dates for trend analysis
 * - Open balances for receivables/aging analysis
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

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

function parseDate(year, month, day) {
  if (!year || !month || !day || year === '' || month === '' || day === '') return null;

  // Convert month name to number
  const months = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  const monthNum = months[month] || month.toString().padStart(2, '0');
  const dayNum = day.toString().padStart(2, '0');

  return `${year}-${monthNum}-${dayNum}`;
}

async function importCombinedData() {
  const client = await pool.connect();

  try {
    console.log('📂 Reading BOTH TPG datasets...\n');

    // ============ STEP 1: Parse Collections Data ============
    console.log('1️⃣  Parsing Collections data (TPG_Collections.csv)...');
    const collectionsPath = path.join(__dirname, '../../Data/TPG_Collections.csv');
    const collectionsContent = fs.readFileSync(collectionsPath, 'utf8');
    const collectionsLines = collectionsContent.split('\n');

    // Find header row
    let colHeaderIdx = 0;
    for (let i = 0; i < collectionsLines.length; i++) {
      if (collectionsLines[i].includes('Total Invoice Amount')) {
        colHeaderIdx = i;
        break;
      }
    }

    const colHeaders = parseCSVLine(collectionsLines[colHeaderIdx]);
    const collectionsMap = new Map();
    let colTotal = 0, colCollected = 0;

    for (let i = colHeaderIdx + 1; i < collectionsLines.length; i++) {
      if (!collectionsLines[i].trim()) continue;

      const values = parseCSVLine(collectionsLines[i]);
      const row = {};
      colHeaders.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const opname = row['opname'];
      if (!opname) continue;

      const invoiceAmt = parseAmount(row['Total Invoice Amount']);
      const collectedAmt = parseAmount(row['Total Amount Collected']);

      if (invoiceAmt === 0) continue;

      colTotal += invoiceAmt;
      colCollected += collectedAmt;

      // Parse collection date from deposited date columns
      const collectionDate = parseDate(
        row['date_deposited_1__c - Year'],
        row['date_deposited_1__c - Month'],
        row['date_deposited_1__c - Day']
      );

      if (!collectionsMap.has(opname)) {
        collectionsMap.set(opname, {
          opname,
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
          write_off_amount: 0,
          open_balance: 0,
          invoice_count: 0,
          collection_date: null,
          invoice_date: row['Invoice_Date'] || null,
        });
      }

      const opp = collectionsMap.get(opname);
      opp.invoice_amount += invoiceAmt;
      opp.collected_amount += collectedAmt;
      opp.write_off_amount += (invoiceAmt - collectedAmt);
      opp.invoice_count += 1;

      // Track earliest collection date
      if (collectionDate && (!opp.collection_date || collectionDate < opp.collection_date)) {
        opp.collection_date = collectionDate;
      }
      if (row['Invoice_Date'] && (!opp.invoice_date || row['Invoice_Date'] < opp.invoice_date)) {
        opp.invoice_date = row['Invoice_Date'];
      }
    }

    console.log(`   ✅ Parsed ${collectionsMap.size} collected opportunities`);
    console.log(`   💰 Collections Total: $${colCollected.toLocaleString()} of $${colTotal.toLocaleString()} (${(colCollected/colTotal*100).toFixed(1)}%)\n`);

    // ============ STEP 2: Parse Invoice Data ============
    console.log('2️⃣  Parsing Invoice data (TPG_Invoice.csv)...');
    const invoicePath = path.join(__dirname, '../../Data/TPG_Invoice.csv');
    const invoiceContent = fs.readFileSync(invoicePath, 'utf8');
    const invoiceLines = invoiceContent.split('\n');

    // Find header row
    let invHeaderIdx = 0;
    for (let i = 0; i < invoiceLines.length; i++) {
      if (invoiceLines[i].startsWith('Invoice_Date2 - Year')) {
        invHeaderIdx = i;
        break;
      }
    }

    const invHeaders = parseCSVLine(invoiceLines[invHeaderIdx]);
    const invoiceMap = new Map();
    let invTotal = 0, invOpen = 0;

    for (let i = invHeaderIdx + 1; i < invoiceLines.length; i++) {
      if (!invoiceLines[i].trim()) continue;

      const values = parseCSVLine(invoiceLines[i]);
      const row = {};
      invHeaders.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      const opname = row['opname'];
      if (!opname) continue;

      const openAmt = parseAmount(row['Open Invoice']);
      const settledAmt = parseAmount(row['Settled']);
      const writeOffAmt = parseAmount(row['Write Off']);
      const totalAmt = openAmt + settledAmt + writeOffAmt;

      if (totalAmt === 0) continue;

      invTotal += totalAmt;
      invOpen += openAmt;

      if (!invoiceMap.has(opname)) {
        invoiceMap.set(opname, {
          opname,
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
          write_off_amount: 0,
          open_balance: 0,
          invoice_count: 0,
          collection_date: null,
          invoice_date: row['Invoice_Date'] || null,
        });
      }

      const opp = invoiceMap.get(opname);
      opp.invoice_amount += totalAmt;
      opp.collected_amount += settledAmt;
      opp.write_off_amount += writeOffAmt;
      opp.open_balance += openAmt;
      opp.invoice_count += 1;

      if (row['Invoice_Date'] && (!opp.invoice_date || row['Invoice_Date'] < opp.invoice_date)) {
        opp.invoice_date = row['Invoice_Date'];
      }
    }

    console.log(`   ✅ Parsed ${invoiceMap.size} opportunities from invoices`);
    console.log(`   💰 Invoice Total: $${invTotal.toLocaleString()}, Open: $${invOpen.toLocaleString()}\n`);

    // ============ STEP 3: Merge & Insert Data ============
    console.log('3️⃣  Merging datasets and inserting...\n');

    // Clear existing data
    await client.query('TRUNCATE TABLE provider_master_data RESTART IDENTITY');

    // Combine both maps - use invoice data as base, overlay collection data
    const allOpps = new Map(invoiceMap);

    // Add collection data from collections CSV (has accurate collected amounts)
    for (const [opname, colOpp] of collectionsMap) {
      if (allOpps.has(opname)) {
        // Merge collection data - use ACTUAL collected amounts from collections file
        const existingOpp = allOpps.get(opname);
        if (colOpp.collection_date) {
          existingOpp.collection_date = colOpp.collection_date;
        }
        // CRITICAL: Use collected_amount from collections file (has actual payments)
        if (colOpp.collected_amount > 0) {
          existingOpp.collected_amount = colOpp.collected_amount;
          existingOpp.write_off_amount = colOpp.write_off_amount;
          // Recalculate open_balance based on actual collections
          existingOpp.open_balance = existingOpp.invoice_amount - colOpp.collected_amount;
          if (existingOpp.open_balance < 0) existingOpp.open_balance = 0;
        }
      } else {
        // Add opportunity from collections that's not in invoices
        allOpps.set(opname, colOpp);
      }
    }

    let inserted = 0;
    let withCollectionDate = 0;
    let withOpenBalance = 0;

    for (const [opname, opp] of allOpps) {
      const invoiceDate = opp.invoice_date;
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
          opp.open_balance,
          opp.collected_amount,
          opp.write_off_amount,
          opp.invoice_amount,
          invoiceDate,
          opp.origination_date || null,
          opp.collection_date,
        ]);
        inserted++;

        if (opp.collection_date) withCollectionDate++;
        if (opp.open_balance > 0) withOpenBalance++;

        if (inserted % 200 === 0) {
          process.stdout.write(`   Inserted ${inserted} opportunities...\r`);
        }
      } catch (err) {
        console.error(`Error inserting ${opname}:`, err.message);
      }
    }

    console.log(`\n✅ Inserted ${inserted} total opportunities`);
    console.log(`   - With collection_date: ${withCollectionDate}`);
    console.log(`   - With open_balance > 0: ${withOpenBalance}\n`);

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

    console.log('\n✅ Combined import complete!\n');

    // Verify
    const verify = await client.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(collection_date) as with_collection_date,
        COUNT(*) FILTER (WHERE open_balance > 0) as with_open_balance,
        SUM(invoice_amount) as total_invoiced,
        SUM(collected_amount) as total_collected,
        SUM(open_balance) as total_open,
        ROUND((SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100)::numeric, 1) as collection_rate
      FROM provider_master_data
    `);

    const v = verify.rows[0];
    console.log('📊 Database Verification:');
    console.log(`   Total Records: ${v.total_records}`);
    console.log(`   With Collection Date: ${v.with_collection_date}`);
    console.log(`   With Open Balance: ${v.with_open_balance}`);
    console.log(`   Total Invoiced: $${parseFloat(v.total_invoiced).toLocaleString()}`);
    console.log(`   Total Collected: $${parseFloat(v.total_collected).toLocaleString()}`);
    console.log(`   Total Open: $${parseFloat(v.total_open).toLocaleString()}`);
    console.log(`   Collection Rate: ${v.collection_rate}%`);

  } catch (error) {
    console.error('❌ Import error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importCombinedData();
