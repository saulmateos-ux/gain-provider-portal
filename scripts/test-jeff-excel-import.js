/**
 * Test/Dry Run for TPG_Analysis_Jeff.xlsx Import
 *
 * This script validates the Excel file structure and data
 * WITHOUT inserting into the database.
 *
 * Use this to verify:
 * 1. Excel file can be read
 * 2. Sheets exist and have expected structure
 * 3. Column mappings are correct
 * 4. Totals match expected values
 * 5. Data merge logic is working
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  const cleaned = String(value).replace(/[$,]/g, '').trim();
  if (cleaned === '' || cleaned === '.') return 0;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function getCellValue(row, colIndex) {
  const cell = row.getCell(colIndex);
  if (!cell || cell.value === null || cell.value === undefined) return '';

  if (typeof cell.value === 'object' && cell.value.result !== undefined) {
    return cell.value.result;
  }

  return cell.value;
}

async function testExcelStructure() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Test/Dry Run: TPG_Analysis_Jeff.xlsx                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const excelPath = path.join(__dirname, '../../Data/TPG_Analysis_Jeff.xlsx');

  console.log('📂 Checking file...');
  if (!fs.existsSync(excelPath)) {
    console.error(`   ❌ File not found: ${excelPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(excelPath);
  console.log(`   ✅ File found: ${excelPath}`);
  console.log(`   📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

  console.log('📖 Loading workbook...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  console.log(`   ✅ Workbook loaded`);
  console.log(`   📑 Sheets: ${workbook.worksheets.map(ws => `"${ws.name}"`).join(', ')}\n`);

  // Test Invoice Data sheet
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Testing Invoice Data Sheet');
  console.log('═══════════════════════════════════════════════════════════\n');

  const invoiceSheet = workbook.getWorksheet('Invoice Data');
  if (!invoiceSheet) {
    console.error('   ❌ "Invoice Data" sheet not found');
    process.exit(1);
  }

  console.log(`✓ Sheet found: "${invoiceSheet.name}"`);
  console.log(`✓ Rows: ${invoiceSheet.rowCount}`);
  console.log(`✓ Columns: ${invoiceSheet.columnCount}\n`);

  // Find header row
  console.log('🔍 Searching for header row...');
  let invoiceHeaderRow = null;
  let invoiceHeaderNum = 0;

  for (let i = 1; i <= Math.min(10, invoiceSheet.rowCount); i++) {
    const row = invoiceSheet.getRow(i);
    const firstCell = getCellValue(row, 1);

    if (String(firstCell).toLowerCase().includes('opname')) {
      invoiceHeaderRow = row;
      invoiceHeaderNum = i;
      break;
    }
  }

  if (!invoiceHeaderRow) {
    console.error('   ❌ Header row not found');
    process.exit(1);
  }

  console.log(`   ✅ Header row found at: ${invoiceHeaderNum}\n`);

  // Map columns
  const invoiceColMap = {};
  invoiceHeaderRow.eachCell((cell, colNumber) => {
    const header = String(cell.value || '').trim();
    if (header) {
      invoiceColMap[header] = colNumber;
    }
  });

  console.log(`📋 Column Mappings (${Object.keys(invoiceColMap).length} columns):`);

  const requiredInvoiceColumns = [
    'opname',
    'opid',
    'law_firm_account_name__c',
    'case_status__c',
    'Tranche_Name',
    'tranche',
    'date_of_accident__c',
    'paname',
    'billingstate',
    'funding_stage__c',
    'payoff_status__c',
    'arbookname',
    'ar_type__c',
    'origination_date__c',
    'Open Invoice',
    'Settled',
    'Write Off',
    'Invoice_Date'
  ];

  let missingCols = [];
  for (const col of requiredInvoiceColumns) {
    if (invoiceColMap[col]) {
      console.log(`   ✅ ${col} → Column ${invoiceColMap[col]}`);
    } else {
      console.log(`   ❌ ${col} → NOT FOUND`);
      missingCols.push(col);
    }
  }

  if (missingCols.length > 0) {
    console.error(`\n❌ Missing required columns: ${missingCols.join(', ')}`);
    console.log('\n📋 Available columns:');
    Object.keys(invoiceColMap).slice(0, 30).forEach(col => {
      console.log(`   - ${col}`);
    });
    process.exit(1);
  }

  // Sample data
  console.log(`\n📊 Sample Invoice Data (rows ${invoiceHeaderNum + 1} to ${invoiceHeaderNum + 3}):`);
  for (let i = invoiceHeaderNum + 1; i <= Math.min(invoiceHeaderNum + 3, invoiceSheet.rowCount); i++) {
    const row = invoiceSheet.getRow(i);
    console.log(`\n   Row ${i}:`);
    console.log(`   - opname: ${getCellValue(row, invoiceColMap['opname'])}`);
    console.log(`   - law_firm: ${getCellValue(row, invoiceColMap['law_firm_account_name__c'])}`);
    console.log(`   - Open Invoice: $${parseAmount(getCellValue(row, invoiceColMap['Open Invoice'])).toFixed(2)}`);
    console.log(`   - Settled: $${parseAmount(getCellValue(row, invoiceColMap['Settled'])).toFixed(2)}`);
    console.log(`   - Write Off: $${parseAmount(getCellValue(row, invoiceColMap['Write Off'])).toFixed(2)}`);
  }

  // Parse full invoice data
  console.log('\n\n🔄 Parsing full Invoice Data...');
  const opportunitiesMap = new Map();
  let invoiceRowsParsed = 0;
  let totalInvoiced = 0;

  for (let i = invoiceHeaderNum + 1; i <= invoiceSheet.rowCount; i++) {
    const row = invoiceSheet.getRow(i);
    const opname = getCellValue(row, invoiceColMap['opname']);
    if (!opname) continue;

    const openInvoice = parseAmount(getCellValue(row, invoiceColMap['Open Invoice']));
    const settled = parseAmount(getCellValue(row, invoiceColMap['Settled']));
    const writeOff = parseAmount(getCellValue(row, invoiceColMap['Write Off']));
    const invoiceAmount = openInvoice + settled + writeOff;

    if (invoiceAmount === 0) continue;

    totalInvoiced += invoiceAmount;
    invoiceRowsParsed++;

    if (!opportunitiesMap.has(opname)) {
      opportunitiesMap.set(opname, {
        invoice_amount: 0,
        open_balance: 0,
        invoice_count: 0,
      });
    }

    const opp = opportunitiesMap.get(opname);
    opp.invoice_amount += invoiceAmount;
    opp.open_balance += openInvoice;
    opp.invoice_count++;
  }

  console.log(`   ✅ Parsed ${invoiceRowsParsed} invoice rows`);
  console.log(`   📊 Unique opportunities: ${opportunitiesMap.size}`);
  console.log(`   💰 Total Invoiced: $${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  // Test Collections Data sheet
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('Testing Collections Data Sheet');
  console.log('═══════════════════════════════════════════════════════════\n');

  const collectionsSheet = workbook.getWorksheet('Collections Data');
  if (!collectionsSheet) {
    console.error('   ❌ "Collections Data" sheet not found');
    process.exit(1);
  }

  console.log(`✓ Sheet found: "${collectionsSheet.name}"`);
  console.log(`✓ Rows: ${collectionsSheet.rowCount}`);
  console.log(`✓ Columns: ${collectionsSheet.columnCount}\n`);

  // Find header row (should be row 2)
  console.log('🔍 Searching for header row (expected at row 2)...');
  let collectionsHeaderRow = null;
  let collectionsHeaderNum = 0;

  for (let i = 1; i <= Math.min(10, collectionsSheet.rowCount); i++) {
    const row = collectionsSheet.getRow(i);
    const cells = [];
    for (let j = 1; j <= 20; j++) {
      cells.push(getCellValue(row, j));
    }
    const rowText = cells.join('|').toLowerCase();

    if (rowText.includes('total amount collected')) {
      collectionsHeaderRow = row;
      collectionsHeaderNum = i;
      break;
    }
  }

  if (!collectionsHeaderRow) {
    console.error('   ❌ Header row not found');
    process.exit(1);
  }

  console.log(`   ✅ Header row found at: ${collectionsHeaderNum}\n`);

  // Map columns
  const collectionsColMap = {};
  collectionsHeaderRow.eachCell((cell, colNumber) => {
    const header = String(cell.value || '').trim();
    if (header) {
      collectionsColMap[header] = colNumber;
    }
  });

  console.log(`📋 Column Mappings (${Object.keys(collectionsColMap).length} columns):`);

  const requiredCollectionsColumns = [
    'opname',
    'Total Amount Collected',
    'date_deposited_1__c - Year',
    'date_deposited_1__c - Month',
    'date_deposited_1__c - Day'
  ];

  missingCols = [];
  for (const col of requiredCollectionsColumns) {
    if (collectionsColMap[col]) {
      console.log(`   ✅ ${col} → Column ${collectionsColMap[col]}`);
    } else {
      console.log(`   ❌ ${col} → NOT FOUND`);
      missingCols.push(col);
    }
  }

  if (missingCols.length > 0) {
    console.error(`\n❌ Missing required columns: ${missingCols.join(', ')}`);
    console.log('\n📋 Available columns:');
    Object.keys(collectionsColMap).slice(0, 30).forEach(col => {
      console.log(`   - ${col}`);
    });
    process.exit(1);
  }

  // Sample data
  console.log(`\n📊 Sample Collections Data (rows ${collectionsHeaderNum + 1} to ${collectionsHeaderNum + 3}):`);
  for (let i = collectionsHeaderNum + 1; i <= Math.min(collectionsHeaderNum + 3, collectionsSheet.rowCount); i++) {
    const row = collectionsSheet.getRow(i);
    console.log(`\n   Row ${i}:`);
    console.log(`   - opname: ${getCellValue(row, collectionsColMap['opname'])}`);
    console.log(`   - Collected: $${parseAmount(getCellValue(row, collectionsColMap['Total Amount Collected'])).toFixed(2)}`);
    console.log(`   - Date: ${getCellValue(row, collectionsColMap['date_deposited_1__c - Year'])}-${getCellValue(row, collectionsColMap['date_deposited_1__c - Month'])}-${getCellValue(row, collectionsColMap['date_deposited_1__c - Day'])}`);
  }

  // Parse full collections data
  console.log('\n\n🔄 Parsing full Collections Data...');
  const collectionsMap = new Map();
  let collectionsRowsParsed = 0;
  let totalCollected = 0;

  for (let i = collectionsHeaderNum + 1; i <= collectionsSheet.rowCount; i++) {
    const row = collectionsSheet.getRow(i);
    const opname = getCellValue(row, collectionsColMap['opname']);
    if (!opname) continue;

    const collectedAmount = parseAmount(getCellValue(row, collectionsColMap['Total Amount Collected']));
    if (collectedAmount === 0) continue;

    totalCollected += collectedAmount;
    collectionsRowsParsed++;

    if (!collectionsMap.has(opname)) {
      collectionsMap.set(opname, { collected_amount: 0 });
    }

    collectionsMap.get(opname).collected_amount += collectedAmount;
  }

  console.log(`   ✅ Parsed ${collectionsRowsParsed} collection rows`);
  console.log(`   📊 Unique opportunities with collections: ${collectionsMap.size}`);
  console.log(`   💰 Total Collected: $${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  // Merge and verify
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('Merge Test & Verification');
  console.log('═══════════════════════════════════════════════════════════\n');

  let withCollections = 0;
  let withoutCollections = 0;
  let finalTotalCollected = 0;

  for (const [opname, opp] of opportunitiesMap) {
    if (collectionsMap.has(opname)) {
      const col = collectionsMap.get(opname);
      finalTotalCollected += col.collected_amount;
      withCollections++;
    } else {
      withoutCollections++;
    }
  }

  console.log('📊 Merge Statistics:');
  console.log(`   - Total opportunities: ${opportunitiesMap.size}`);
  console.log(`   - With collections: ${withCollections}`);
  console.log(`   - Without collections: ${withoutCollections}`);
  console.log(`   - Opportunities only in collections: ${collectionsMap.size - withCollections}\n`);

  console.log('💰 Financial Totals:');
  console.log(`   - Total Invoiced: $${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   - Total Collected: $${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  const collectionRate = (totalCollected / totalInvoiced * 100);
  console.log(`   - Collection Rate: ${collectionRate.toFixed(2)}%\n`);

  console.log('🎯 Expected Values:');
  console.log(`   - Total Opportunities: 1,524`);
  console.log(`   - Total Invoiced: $5,563,375.23`);
  console.log(`   - Total Collected: $1,286,876.73`);
  console.log(`   - Collection Rate: 23.13%\n`);

  console.log('✓ Validation:');

  const expectedOpportunities = 1524;
  const expectedInvoiced = 5563375.23;
  const expectedCollected = 1286876.73;
  const expectedRate = 23.13;

  const oppMatch = opportunitiesMap.size === expectedOpportunities;
  const invoiceMatch = Math.abs(totalInvoiced - expectedInvoiced) < 1.0;
  const collectedMatch = Math.abs(totalCollected - expectedCollected) < 1.0;
  const rateMatch = Math.abs(collectionRate - expectedRate) < 0.5;

  console.log(`   ${oppMatch ? '✅' : '❌'} Opportunities: ${opportunitiesMap.size} ${oppMatch ? '==' : '!='} ${expectedOpportunities}`);
  console.log(`   ${invoiceMatch ? '✅' : '❌'} Invoiced: $${totalInvoiced.toFixed(2)} ${invoiceMatch ? '≈' : '!='} $${expectedInvoiced.toFixed(2)} (diff: $${Math.abs(totalInvoiced - expectedInvoiced).toFixed(2)})`);
  console.log(`   ${collectedMatch ? '✅' : '❌'} Collected: $${totalCollected.toFixed(2)} ${collectedMatch ? '≈' : '!='} $${expectedCollected.toFixed(2)} (diff: $${Math.abs(totalCollected - expectedCollected).toFixed(2)})`);
  console.log(`   ${rateMatch ? '✅' : '❌'} Rate: ${collectionRate.toFixed(2)}% ${rateMatch ? '≈' : '!='} ${expectedRate}% (diff: ${Math.abs(collectionRate - expectedRate).toFixed(2)}%)`);

  console.log('\n═══════════════════════════════════════════════════════════');

  if (oppMatch && invoiceMatch && collectedMatch && rateMatch) {
    console.log('✅ ALL TESTS PASSED');
    console.log('   Ready to run import-jeff-excel.js');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('   Review differences before proceeding');
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

testExcelStructure().catch(err => {
  console.error('\n❌ Test failed:', err);
  console.error(err.stack);
  process.exit(1);
});
