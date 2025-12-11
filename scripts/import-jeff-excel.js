/**
 * Import TPG_Analysis_Jeff.xlsx
 *
 * CRITICAL FINANCIAL DATA IMPORT
 *
 * This script imports Jeff's comprehensive Excel analysis containing:
 * - Invoice Data sheet: 15,738 invoices across 1,524 opportunities
 * - Collections Data sheet: 5,698 collection records for 588 opportunities
 *
 * Expected Totals (MUST MATCH):
 * - Total Opportunities: 1,524
 * - Total Invoice Amount: $5,563,375.23
 * - Total Collected: $1,286,876.73
 * - Collection Rate: 23.13%
 *
 * Data Merge Strategy:
 * 1. Parse Invoice Data for all opportunities
 * 2. Parse Collections Data for actual collected amounts
 * 3. Merge on opportunity_name (opname)
 * 4. For collected opportunities: use actual collected_amount
 * 5. For uncollected opportunities: collected_amount = 0, open_balance = invoice_amount
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Utility functions
function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const cleaned = String(value).replace(/[$,]/g, '').trim();
  if (cleaned === '' || cleaned === '.') return 0;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDate(year, month, day) {
  if (!year || !month || !day) return null;

  // Convert month name to number if needed
  const months = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

  const monthStr = String(month).trim();
  const monthNum = months[monthStr] || String(month).padStart(2, '0');
  const yearStr = String(year);
  const dayStr = String(day).padStart(2, '0');

  // Validate date components
  if (!yearStr || !monthNum || !dayStr) return null;

  return `${yearStr}-${monthNum}-${dayStr}`;
}

function getCellValue(row, colIndex) {
  const cell = row.getCell(colIndex);
  if (!cell || cell.value === null || cell.value === undefined) return '';

  // Handle different cell types
  if (typeof cell.value === 'object' && cell.value.result !== undefined) {
    return cell.value.result; // Formula result
  }

  return cell.value;
}

async function backupCurrentData(client) {
  console.log('💾 Creating backup of current database state...');

  try {
    const backupDir = path.join(__dirname, '../../Data/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFile = path.join(backupDir, `provider_master_data_backup_${timestamp}.json`);

    const result = await client.query('SELECT * FROM provider_master_data');
    const backupData = {
      exportDate: new Date().toISOString(),
      recordCount: result.rows.length,
      data: result.rows
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`   ✅ Backup saved: ${backupFile}`);
    console.log(`   📊 Backed up ${result.rows.length} records\n`);

    return backupFile;
  } catch (error) {
    console.error('   ⚠️  Backup failed (continuing anyway):', error.message);
    return null;
  }
}

async function parseInvoiceData(workbook) {
  console.log('1️⃣  Parsing Invoice Data sheet...');

  const sheet = workbook.getWorksheet('Invoice Data');
  if (!sheet) {
    throw new Error('Invoice Data sheet not found in workbook');
  }

  console.log(`   Sheet found: ${sheet.name} (${sheet.rowCount} rows)`);

  // Find header row by looking for key columns anywhere in the row
  let headerRow = null;
  let headerRowNum = 0;

  for (let i = 1; i <= Math.min(10, sheet.rowCount); i++) {
    const row = sheet.getRow(i);
    const rowValues = [];
    row.eachCell((cell) => {
      rowValues.push(String(cell.value || '').toLowerCase());
    });
    const rowText = rowValues.join('|');

    // Look for key columns like opname, Invoice_Date, or Open Invoice
    if (rowText.includes('opname') || rowText.includes('invoice_date') || rowText.includes('open invoice')) {
      headerRow = row;
      headerRowNum = i;
      break;
    }
  }

  if (!headerRow) {
    throw new Error('Header row not found in Invoice Data sheet');
  }

  // Build column index map
  const colMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value || '').trim();
    if (header) {
      colMap[header] = colNumber;
    }
  });

  console.log(`   Found ${Object.keys(colMap).length} columns`);
  console.log(`   Header row: ${headerRowNum}`);

  // Parse data rows
  const opportunitiesMap = new Map();
  let rowsParsed = 0;
  let totalInvoiced = 0;

  for (let i = headerRowNum + 1; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);

    // Skip empty rows
    const opname = getCellValue(row, colMap['opname']);
    if (!opname) continue;

    // Parse invoice amounts
    const openInvoice = parseAmount(getCellValue(row, colMap['Open Invoice']));
    const settled = parseAmount(getCellValue(row, colMap['Settled']));
    const writeOff = parseAmount(getCellValue(row, colMap['Write Off']));
    const invoiceAmount = openInvoice + settled + writeOff;

    if (invoiceAmount === 0) continue;

    totalInvoiced += invoiceAmount;
    rowsParsed++;

    // Initialize or update opportunity
    if (!opportunitiesMap.has(opname)) {
      opportunitiesMap.set(opname, {
        opportunity_name: opname,
        opportunity_id: getCellValue(row, colMap['opid']) || '',
        law_firm_name: getCellValue(row, colMap['law_firm_account_name__c']) || '',
        case_status: getCellValue(row, colMap['case_status__c']) || '',
        tranche_name: getCellValue(row, colMap['Tranche_Name']) || '',
        tranche_id: getCellValue(row, colMap['tranche']) || '',
        date_of_accident: getCellValue(row, colMap['date_of_accident__c']) || null,
        provider_name: getCellValue(row, colMap['paname']) || 'Therapy Partners Group - Parent',
        state: getCellValue(row, colMap['billingstate']) || '',
        funding_stage: getCellValue(row, colMap['funding_stage__c']) || '',
        payoff_status: getCellValue(row, colMap['payoff_status__c']) || '',
        ar_book_name: getCellValue(row, colMap['arbookname']) || '',
        ar_type: getCellValue(row, colMap['ar_type__c']) || '',
        origination_date: getCellValue(row, colMap['origination_date__c']) || null,
        invoice_amount: 0,
        collected_amount: 0,
        write_off_amount: 0,
        open_balance: 0,
        invoice_date: null,
        collection_date: null,
      });
    }

    const opp = opportunitiesMap.get(opname);
    opp.invoice_amount += invoiceAmount;
    opp.open_balance += openInvoice;
    opp.write_off_amount += writeOff;

    // Track earliest invoice date
    const invoiceDate = getCellValue(row, colMap['Invoice_Date']);
    if (invoiceDate) {
      if (!opp.invoice_date || invoiceDate < opp.invoice_date) {
        opp.invoice_date = invoiceDate;
      }
    }

    if (rowsParsed % 1000 === 0) {
      process.stdout.write(`   Parsed ${rowsParsed} invoice rows...\r`);
    }
  }

  console.log(`\n   ✅ Parsed ${rowsParsed} invoice rows`);
  console.log(`   📊 Found ${opportunitiesMap.size} unique opportunities`);
  console.log(`   💰 Total Invoiced: $${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`);

  return { opportunities: opportunitiesMap, totalInvoiced, rowCount: rowsParsed };
}

async function parseCollectionsData(workbook) {
  console.log('2️⃣  Parsing Collections Data sheet...');

  const sheet = workbook.getWorksheet('Collections Data');
  if (!sheet) {
    throw new Error('Collections Data sheet not found in workbook');
  }

  console.log(`   Sheet found: ${sheet.name} (${sheet.rowCount} rows)`);

  // Find header row (should be at row 2)
  let headerRow = null;
  let headerRowNum = 0;

  for (let i = 1; i <= Math.min(10, sheet.rowCount); i++) {
    const row = sheet.getRow(i);
    const cells = [];
    for (let j = 1; j <= 20; j++) {
      cells.push(getCellValue(row, j));
    }
    const rowText = cells.join('|').toLowerCase();

    if (rowText.includes('total amount collected') || rowText.includes('opname')) {
      headerRow = row;
      headerRowNum = i;
      break;
    }
  }

  if (!headerRow) {
    throw new Error('Header row not found in Collections Data sheet (expected at row 2)');
  }

  // Build column index map
  const colMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value || '').trim();
    if (header) {
      colMap[header] = colNumber;
    }
  });

  console.log(`   Found ${Object.keys(colMap).length} columns`);
  console.log(`   Header row: ${headerRowNum}`);

  // Parse data rows
  const collectionsMap = new Map();
  let rowsParsed = 0;
  let totalCollected = 0;

  for (let i = headerRowNum + 1; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i);

    // Skip empty rows
    const opname = getCellValue(row, colMap['opname']);
    if (!opname) continue;

    const collectedAmount = parseAmount(getCellValue(row, colMap['Total Amount Collected']));

    if (collectedAmount === 0) continue;

    totalCollected += collectedAmount;
    rowsParsed++;

    // Parse collection date from deposited date columns
    const year = getCellValue(row, colMap['date_deposited_1__c - Year']);
    const month = getCellValue(row, colMap['date_deposited_1__c - Month']);
    const day = getCellValue(row, colMap['date_deposited_1__c - Day']);
    const collectionDate = parseDate(year, month, day);

    // Initialize or update collection data
    if (!collectionsMap.has(opname)) {
      collectionsMap.set(opname, {
        collected_amount: 0,
        collection_date: null,
      });
    }

    const col = collectionsMap.get(opname);
    col.collected_amount += collectedAmount;

    // Track earliest collection date
    if (collectionDate) {
      if (!col.collection_date || collectionDate < col.collection_date) {
        col.collection_date = collectionDate;
      }
    }

    if (rowsParsed % 500 === 0) {
      process.stdout.write(`   Parsed ${rowsParsed} collection rows...\r`);
    }
  }

  console.log(`\n   ✅ Parsed ${rowsParsed} collection rows`);
  console.log(`   📊 Found ${collectionsMap.size} opportunities with collections`);
  console.log(`   💰 Total Collected: $${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`);

  return { collections: collectionsMap, totalCollected, rowCount: rowsParsed };
}

function mergeData(invoiceData, collectionsData) {
  console.log('3️⃣  Merging Invoice and Collections data...');

  const { opportunities } = invoiceData;
  const { collections } = collectionsData;

  let withCollections = 0;
  let withoutCollections = 0;

  // Merge collections data into opportunities
  for (const [opname, opp] of opportunities) {
    if (collections.has(opname)) {
      const col = collections.get(opname);

      // CRITICAL: Use actual collected amount from Collections Data
      opp.collected_amount = col.collected_amount;
      opp.collection_date = col.collection_date;

      // Recalculate write_off_amount and open_balance
      opp.write_off_amount = opp.invoice_amount - col.collected_amount;
      opp.open_balance = opp.invoice_amount - col.collected_amount;

      // Ensure non-negative values
      if (opp.open_balance < 0) opp.open_balance = 0;
      if (opp.write_off_amount < 0) opp.write_off_amount = 0;

      withCollections++;
    } else {
      // No collections for this opportunity
      opp.collected_amount = 0;
      opp.collection_date = null;
      opp.open_balance = opp.invoice_amount;

      withoutCollections++;
    }
  }

  console.log(`   ✅ Merged data for ${opportunities.size} opportunities`);
  console.log(`   - With collections: ${withCollections}`);
  console.log(`   - Without collections: ${withoutCollections}\n`);

  return opportunities;
}

async function insertData(client, opportunities) {
  console.log('4️⃣  Inserting data into database...');

  // Clear existing data
  console.log('   Truncating existing data...');
  await client.query('TRUNCATE TABLE provider_master_data RESTART IDENTITY CASCADE');

  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const [opname, opp] of opportunities) {
    // Skip if no invoice_date
    if (!opp.invoice_date) {
      skipped++;
      continue;
    }

    // Generate salesforce_id if missing
    const salesforceId = opp.opportunity_id ||
      `OPP-${opname.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15)}`;

    try {
      await client.query(`
        INSERT INTO provider_master_data (
          salesforce_id,
          opportunity_id,
          opportunity_name,
          law_firm_name,
          case_status,
          tranche_name,
          tranche_id,
          date_of_accident,
          provider_name,
          provider_id,
          state,
          funding_stage,
          payoff_status,
          ar_book_name,
          ar_type,
          invoice_amount,
          collected_amount,
          write_off_amount,
          open_balance,
          invoice_date,
          origination_date,
          collection_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `, [
        salesforceId,
        opp.opportunity_id || salesforceId,
        opp.opportunity_name,
        opp.law_firm_name || '',
        opp.case_status || '',
        opp.tranche_name || '',
        opp.tranche_id || '',
        opp.date_of_accident || null,
        opp.provider_name || 'Therapy Partners Group - Parent',
        'TPG-001',
        opp.state || '',
        opp.funding_stage || '',
        opp.payoff_status || '',
        opp.ar_book_name || '',
        opp.ar_type || '',
        opp.invoice_amount,
        opp.collected_amount,
        opp.write_off_amount,
        opp.open_balance,
        opp.invoice_date,
        opp.origination_date || null,
        opp.collection_date || null,
      ]);

      inserted++;

      if (inserted % 100 === 0) {
        process.stdout.write(`   Inserted ${inserted} records...\r`);
      }
    } catch (err) {
      errors.push({ opportunity: opname, error: err.message });

      if (errors.length <= 5) {
        console.error(`\n   ⚠️  Error inserting ${opname}:`, err.message);
      }
    }
  }

  console.log(`\n   ✅ Inserted ${inserted} records`);
  if (skipped > 0) {
    console.log(`   ⚠️  Skipped ${skipped} records (missing invoice_date)`);
  }
  if (errors.length > 0) {
    console.log(`   ❌ Failed ${errors.length} records`);
  }
  console.log();

  return { inserted, skipped, errors };
}

async function refreshViews(client) {
  console.log('5️⃣  Refreshing materialized views...');

  const viewsDir = path.join(__dirname, '../sql/views');

  if (!fs.existsSync(viewsDir)) {
    console.log('   ⚠️  Views directory not found, skipping...\n');
    return;
  }

  const viewFiles = fs.readdirSync(viewsDir)
    .filter(f => f.endsWith('_mv.sql'))
    .sort();

  let refreshed = 0;

  for (const viewFile of viewFiles) {
    try {
      const viewPath = path.join(viewsDir, viewFile);
      const sql = fs.readFileSync(viewPath, 'utf8');

      await client.query(sql);
      console.log(`   ✅ ${viewFile.replace('.sql', '')}`);
      refreshed++;
    } catch (err) {
      console.error(`   ❌ ${viewFile}:`, err.message);
    }
  }

  console.log(`\n   Refreshed ${refreshed} views\n`);
}

async function verifyImport(client, expectedTotals) {
  console.log('6️⃣  Verifying import...\n');

  const result = await client.query(`
    SELECT
      COUNT(*) as record_count,
      COUNT(DISTINCT opportunity_name) as unique_opportunities,
      SUM(invoice_amount) as total_invoice_amount,
      SUM(collected_amount) as total_collected_amount,
      SUM(open_balance) as total_open_balance,
      SUM(write_off_amount) as total_write_off,
      ROUND((SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100)::numeric, 2) as collection_rate,
      COUNT(*) FILTER (WHERE collection_date IS NOT NULL) as with_collection_date,
      COUNT(*) FILTER (WHERE open_balance > 0) as with_open_balance
    FROM provider_master_data
  `);

  const actual = result.rows[0];

  console.log('📊 VERIFICATION RESULTS:');
  console.log('═══════════════════════════════════════════════════════════');

  // Record count
  console.log(`\n✓ Total Records: ${actual.record_count}`);
  console.log(`  Expected: ${expectedTotals.totalOpportunities}`);
  const recordMatch = parseInt(actual.record_count) === expectedTotals.totalOpportunities;
  console.log(`  Status: ${recordMatch ? '✅ MATCH' : '⚠️  MISMATCH'}`);

  // Invoice amount
  const actualInvoice = parseFloat(actual.total_invoice_amount);
  console.log(`\n✓ Total Invoice Amount: $${actualInvoice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  Expected: $${expectedTotals.totalInvoice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const invoiceDiff = Math.abs(actualInvoice - expectedTotals.totalInvoice);
  const invoiceMatch = invoiceDiff < 1.0; // Allow $1 variance for rounding
  console.log(`  Difference: $${invoiceDiff.toFixed(2)}`);
  console.log(`  Status: ${invoiceMatch ? '✅ MATCH' : '⚠️  MISMATCH'}`);

  // Collected amount
  const actualCollected = parseFloat(actual.total_collected_amount);
  console.log(`\n✓ Total Collected Amount: $${actualCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  Expected: $${expectedTotals.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const collectedDiff = Math.abs(actualCollected - expectedTotals.totalCollected);
  const collectedMatch = collectedDiff < 1.0; // Allow $1 variance for rounding
  console.log(`  Difference: $${collectedDiff.toFixed(2)}`);
  console.log(`  Status: ${collectedMatch ? '✅ MATCH' : '⚠️  MISMATCH'}`);

  // Collection rate
  const actualRate = parseFloat(actual.collection_rate);
  console.log(`\n✓ Collection Rate: ${actualRate}%`);
  console.log(`  Expected: ~${expectedTotals.collectionRate}%`);
  const rateDiff = Math.abs(actualRate - expectedTotals.collectionRate);
  const rateMatch = rateDiff < 0.5; // Allow 0.5% variance
  console.log(`  Difference: ${rateDiff.toFixed(2)}%`);
  console.log(`  Status: ${rateMatch ? '✅ MATCH' : '⚠️  MISMATCH'}`);

  // Additional stats
  console.log(`\n✓ Open Balance: $${parseFloat(actual.total_open_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`✓ Write-offs: $${parseFloat(actual.total_write_off).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`✓ Records with collection_date: ${actual.with_collection_date}`);
  console.log(`✓ Records with open_balance > 0: ${actual.with_open_balance}`);

  console.log('\n═══════════════════════════════════════════════════════════');

  const allMatch = recordMatch && invoiceMatch && collectedMatch && rateMatch;

  if (allMatch) {
    console.log('✅ ALL VALIDATIONS PASSED');
  } else {
    console.log('⚠️  SOME VALIDATIONS FAILED - Review differences above');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  return allMatch;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  TPG Analysis Jeff Excel Import                          ║');
  console.log('║  CRITICAL FINANCIAL DATA                                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const client = await pool.connect();

  try {
    // Step 0: Backup existing data
    await backupCurrentData(client);

    // Step 1: Load Excel file
    console.log('📂 Loading Excel file...');
    const excelPath = path.join(__dirname, '../../Data/TPG_Analysis_Jeff.xlsx');

    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found: ${excelPath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    console.log(`   ✅ Loaded: ${excelPath}`);
    console.log(`   📊 Worksheets: ${workbook.worksheets.map(ws => ws.name).join(', ')}\n`);

    // Step 2: Parse Invoice Data
    const invoiceData = await parseInvoiceData(workbook);

    // Step 3: Parse Collections Data
    const collectionsData = await parseCollectionsData(workbook);

    // Step 4: Merge data
    const mergedOpportunities = mergeData(invoiceData, collectionsData);

    // Step 5: Insert into database
    const insertResult = await insertData(client, mergedOpportunities);

    // Step 6: Refresh materialized views
    await refreshViews(client);

    // Step 7: Verify totals
    const expectedTotals = {
      totalOpportunities: 1524,
      totalInvoice: 5563375.23,
      totalCollected: 1286876.73,
      collectionRate: 23.13,
    };

    const verified = await verifyImport(client, expectedTotals);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Import completed in ${elapsed}s`);

    if (!verified) {
      console.log('\n⚠️  WARNING: Some validation checks failed.');
      console.log('   Review the differences above before proceeding.');
    }

  } catch (error) {
    console.error('\n❌ IMPORT FAILED:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { main };
