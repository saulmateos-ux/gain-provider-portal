/**
 * Import Data from TPG Analysis CSVs
 * Uses TPG_Analysis_Jeff_Invoice.csv and TPG_Analysis_Jeff_Collections.csv
 */

const { Pool } = require('pg');
const fs = require('fs');
const Papa = require('papaparse');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WGcTRM9Oefd8@ep-withered-violet-a47xek4z-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importData() {
  console.log('🚀 Importing TPG Analysis data...\n');

  try {
    // 1. Clear existing data
    console.log('🗑️  Clearing existing data...');
    await pool.query('DELETE FROM provider_master_data');
    console.log('   ✅ Cleared\n');

    // 2. Read Collections CSV to build lookup map
    console.log('📂 Reading Collections CSV...');
    const collectionsPath = '../Data/TPG_Analysis_Jeff_Collections.csv';
    const collectionsContent = fs.readFileSync(collectionsPath, 'utf8');
    const collectionsParsed = Papa.parse(collectionsContent, {
      header: true,
      skipEmptyLines: true,
    });

    // Build collections lookup by fid
    const collectionsMap = new Map();
    collectionsParsed.data.forEach(row => {
      const fid = row['fid'];
      if (fid) {
        // Parse collection date from year/month/day columns
        const year = row['date_deposited_1__c - Year'];
        const month = row['date_deposited_1__c - Month'];
        const day = row['date_deposited_1__c - Day'];

        let collectionDate = null;
        if (year && month && day) {
          const monthNum = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
          }[month];
          if (monthNum) {
            collectionDate = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
          }
        }

        // Parse collected amount (remove $ and commas)
        const collectedAmount = parseFloat((row['Total Amount Collected'] || '0').replace(/[$,]/g, '')) || 0;

        collectionsMap.set(fid, {
          collected_amount: collectedAmount,
          collection_date: collectionDate
        });
      }
    });

    console.log(`   ✅ Found ${collectionsMap.size} collection records\n`);

    // 3. Read Invoice CSV
    console.log('📂 Reading Invoice CSV...');
    const invoicePath = '../Data/TPG_Analysis_Jeff_Invoice.csv';
    const invoiceContent = fs.readFileSync(invoicePath, 'utf8');
    const invoiceParsed = Papa.parse(invoiceContent, {
      header: true,
      skipEmptyLines: true,
    });

    console.log(`   ✅ Found ${invoiceParsed.data.length} invoice records\n`);

    // 4. Import merged data
    console.log('⬆️  Importing records...');
    let imported = 0;
    let skipped = 0;
    const batchSize = 100;

    for (let i = 0; i < invoiceParsed.data.length; i += batchSize) {
      const batch = invoiceParsed.data.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          const fid = row['fid'];

          // Parse financial values from Invoice CSV
          const openInvoice = parseFloat(row['Open Invoice'] || 0);
          const settled = parseFloat(row['Settled'] || 0);
          const writeOff = parseFloat(row['Write Off'] || 0);
          const totalInvoice = parseFloat(row[' Total Invoice '] || 0);

          // Skip if no invoice amount
          if (totalInvoice === 0) {
            skipped++;
            continue;
          }

          // Get collection data from collections map
          const collectionData = collectionsMap.get(fid) || {
            collected_amount: settled, // Use settled from invoice if no collection record
            collection_date: null
          };

          // Calculate open balance
          const openBalance = totalInvoice - collectionData.collected_amount - writeOff;

          const sql = `
            INSERT INTO provider_master_data (
              salesforce_id, funding_id, patient_name, opportunity_id, opportunity_name,
              date_of_accident, law_firm_id, law_firm_name, attorney_name,
              provider_id, provider_name, location_id, location_name, region, state,
              invoice_amount, collected_amount, write_off_amount, open_balance,
              invoice_date, origination_date, settlement_date, collection_date,
              funding_stage, case_status, payoff_status,
              tranche_id, tranche_name, ar_book_name, ar_type
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
            )
          `;

          const values = [
            fid || `UNKNOWN-${i}`,                                   // salesforce_id
            fid || null,                                             // funding_id
            row['paname'] || 'Unknown Patient',                      // patient_name
            row['opid'] || `OPP-${i}`,                              // opportunity_id
            row['opname'] || 'Unknown Opportunity',                  // opportunity_name
            row['date_of_accident__c'] || null,                      // date_of_accident
            row['accountid'] || null,                                // law_firm_id
            row['law_firm_account_name__c'] || 'Unknown Law Firm',   // law_firm_name
            row['attorneyname'] || null,                             // attorney_name
            'TPG001',                                                // provider_id (consolidated)
            'Therapy Partners Group - Parent',                       // provider_name (consolidated)
            row['portmedfac'] || null,                               // location_id
            row['mfname'] || row['medlocale'] || null,               // location_name (preserve original location)
            null,                                                    // region
            row['billingstate'] || null,                             // state
            totalInvoice,                                            // invoice_amount
            collectionData.collected_amount,                         // collected_amount (from Collections CSV)
            writeOff,                                                // write_off_amount
            openBalance,                                             // open_balance
            row['Invoice_Date'] || row['createddate'],               // invoice_date
            row['origination_date__c'] || row['createddate'],        // origination_date
            row['payoff_recieved_1'] || null,                        // settlement_date
            collectionData.collection_date,                          // collection_date (from Collections CSV!)
            row['funding_stage__c'] || 'Unknown',                    // funding_stage
            row['case_status__c'] || 'Active',                       // case_status
            row['payoff_status__c'] || 'Unpaid',                     // payoff_status
            row['tranche'] || null,                                  // tranche_id
            row['Tranche_Name'] || null,                             // tranche_name
            row['arbookname'] || 'TPG AR Book',                      // ar_book_name
            row['ar_type__c'] || 'Medical Receivables'               // ar_type
          ];

          await pool.query(sql, values);
          imported++;
        } catch (err) {
          console.error(`   ⚠️  Row ${i}: ${err.message}`);
          skipped++;
        }
      }

      // Progress update
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= invoiceParsed.data.length) {
        console.log(`   ✓ Processed ${Math.min(i + batchSize, invoiceParsed.data.length)}/${invoiceParsed.data.length} records`);
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}\n`);

    // 5. Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    await pool.query('DROP MATERIALIZED VIEW IF EXISTS receivables_by_case_status_mv CASCADE');
    const viewSQL = fs.readFileSync('/Users/saulmateos/Documents/GitHub/Portal_Update/provider-portal/sql/views/receivables_by_case_status_mv.sql', 'utf8');
    await pool.query(viewSQL);
    console.log('   ✅ Views refreshed\n');

    // 6. Show summary
    console.log('📊 Database Summary:');
    const count = await pool.query('SELECT COUNT(*) FROM provider_master_data');
    console.log(`   Total Records: ${count.rows[0].count}`);

    const totalInvoiced = await pool.query('SELECT SUM(invoice_amount) as total FROM provider_master_data');
    console.log(`   Total Invoiced: $${parseFloat(totalInvoiced.rows[0].total || 0).toLocaleString()}`);

    const totalCollected = await pool.query('SELECT SUM(collected_amount) as total FROM provider_master_data');
    console.log(`   Total Collected: $${parseFloat(totalCollected.rows[0].total || 0).toLocaleString()}`);

    const openAR = await pool.query('SELECT SUM(open_balance) as total FROM provider_master_data');
    console.log(`   Open AR: $${parseFloat(openAR.rows[0].total || 0).toLocaleString()}`);

    const withCollectionDate = await pool.query('SELECT COUNT(*) as total FROM provider_master_data WHERE collection_date IS NOT NULL');
    console.log(`   Records with Collection Date: ${withCollectionDate.rows[0].total}`);

    const collectionRate = await pool.query(`
      SELECT ROUND(
        (SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100)::numeric, 2
      ) as rate FROM provider_master_data
    `);
    console.log(`   Collection Rate: ${collectionRate.rows[0].rate}%`);

    console.log('\n📋 VALIDATION CHECKS:\n');

    // CRITICAL: Validate collection dates
    if (parseInt(withCollectionDate.rows[0].total) === 0) {
      console.log('❌ CRITICAL ERROR: No collection dates imported!');
      console.log('   Collections page will show all zeros!');
      console.log('   Check that you are using TPG_Analysis_Jeff_Collections.csv');
      console.log('   and that the date_deposited_1__c columns exist.\n');
      throw new Error('Import validation failed: No collection dates');
    } else if (parseInt(withCollectionDate.rows[0].total) < 5000) {
      console.log('⚠️  WARNING: Low collection date count!');
      console.log(`   Expected: 5,000+, Got: ${withCollectionDate.rows[0].total}`);
      console.log('   Collections page may have incomplete data.\n');
    } else {
      console.log(`✅ Collection dates: ${withCollectionDate.rows[0].total} records (Good!)`);
    }

    // Validate total records
    if (parseInt(count.rows[0].count) < 15000) {
      console.log(`⚠️  WARNING: Low record count! Expected: 15,000+, Got: ${count.rows[0].count}`);
    } else {
      console.log(`✅ Total records: ${count.rows[0].count} (Good!)`);
    }

    // Validate collection rate
    const rate = parseFloat(collectionRate.rows[0].rate || 0);
    if (rate < 30 || rate > 80) {
      console.log(`⚠️  WARNING: Collection rate ${rate}% seems unusual (expected 30-80%)`);
    } else {
      console.log(`✅ Collection rate: ${rate}% (Good!)`);
    }

    console.log('\n✨ Data import complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importData();
