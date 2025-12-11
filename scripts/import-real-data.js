/**
 * Import Real TPG Data from CSV
 * Maps Salesforce export to provider_master_data schema
 */

const { Pool } = require('pg');
const fs = require('fs');
const Papa = require('papaparse');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WGcTRM9Oefd8@ep-withered-violet-a47xek4z-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importRealData() {
  console.log('🚀 Importing real TPG data...\n');

  try {
    // 1. Clear existing data
    console.log('🗑️  Clearing sample data...');
    await pool.query('DELETE FROM provider_master_data');
    console.log('   ✅ Cleared\n');

    // 2. Read CSV file
    console.log('📂 Reading TPG_Invoice.csv...');
    const csvPath = '../Data/TPG_Invoice.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV (skip first 7 rows which are filter info)
    const lines = csvContent.split('\n');
    const dataLines = lines.slice(7).join('\n'); // Skip filter rows

    const parsed = Papa.parse(dataLines, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    console.log(`   ✅ Found ${parsed.data.length} records\n`);

    // 3. Import records in batches
    console.log('⬆️  Importing records...');
    let imported = 0;
    let skipped = 0;
    const batchSize = 100;

    for (let i = 0; i < parsed.data.length; i += batchSize) {
      const batch = parsed.data.slice(i, i + batchSize);

      for (const row of batch) {
        try {
          // Parse financial values
          const openInvoice = parseFloat(row['Open Invoice'] || 0);
          const settled = parseFloat(row['Settled'] || 0);
          const writeOff = parseFloat(row['Write Off'] || 0);
          const invoiceAmount = openInvoice + settled + writeOff;

          // Skip if no invoice amount
          if (invoiceAmount === 0) {
            skipped++;
            continue;
          }

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
            row['fid'] || `UNKNOWN-${i}`,                          // salesforce_id
            row['fid'] || null,                                     // funding_id
            row['paname'] || 'Unknown Patient',                     // patient_name
            row['opid'] || `OPP-${i}`,                             // opportunity_id
            row['opname'] || 'Unknown Opportunity',                 // opportunity_name
            row['date_of_accident__c'] || null,                     // date_of_accident
            row['accountid'] || null,                               // law_firm_id
            row['law_firm_account_name__c'] || 'Unknown Law Firm',  // law_firm_name
            row['attorneyname'] || null,                            // attorney_name
            'TPG001',                                               // provider_id (consolidate all to parent)
            'Therapy Partners Group - Parent',                      // provider_name (consolidate all locations)
            row['portmedfac'] || null,                              // location_id
            row['mfname'] || row['medlocale'] || null,              // location_name (preserve original location)
            null,                                                   // region
            row['billingstate'] || null,                            // state
            invoiceAmount,                                          // invoice_amount
            settled,                                                // collected_amount
            writeOff,                                               // write_off_amount
            openInvoice,                                            // open_balance
            row['Invoice_Date'] || row['createddate'],             // invoice_date
            row['origination_date__c'] || row['createddate'],      // origination_date
            row['payoff_recieved_1'] || null,                       // settlement_date
            row['payoff_recieved_1'] || null,                       // collection_date
            row['funding_stage__c'] || 'Unknown',                   // funding_stage
            row['case_status__c'] || 'Active',                      // case_status
            row['payoff_status__c'] || 'Unpaid',                    // payoff_status
            row['tranche'] || null,                                 // tranche_id
            row['Tranche_Name'] || null,                            // tranche_name
            row['arbookname'] || 'TPG AR Book',                     // ar_book_name
            row['ar_type__c'] || 'Medical Receivables'              // ar_type
          ];

          await pool.query(sql, values);
          imported++;
        } catch (err) {
          console.error(`   ⚠️  Row ${i}: ${err.message}`);
          skipped++;
        }
      }

      // Progress update
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= parsed.data.length) {
        console.log(`   ✓ Processed ${Math.min(i + batchSize, parsed.data.length)}/${parsed.data.length} records`);
      }
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}\n`);

    // 4. Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    await pool.query('SELECT * FROM refresh_all_materialized_views()');
    console.log('   ✅ Views refreshed\n');

    // 5. Show summary
    console.log('📊 Database Summary:');
    const count = await pool.query('SELECT COUNT(*) FROM provider_master_data');
    console.log(`   Total Records: ${count.rows[0].count}`);

    const totalInvoiced = await pool.query('SELECT SUM(invoice_amount) as total FROM provider_master_data');
    console.log(`   Total Invoiced: $${parseFloat(totalInvoiced.rows[0].total || 0).toLocaleString()}`);

    const totalCollected = await pool.query('SELECT SUM(collected_amount) as total FROM provider_master_data');
    console.log(`   Total Collected: $${parseFloat(totalCollected.rows[0].total || 0).toLocaleString()}`);

    const openAR = await pool.query('SELECT SUM(open_balance) as total FROM provider_master_data');
    console.log(`   Open AR: $${parseFloat(openAR.rows[0].total || 0).toLocaleString()}`);

    const collectionRate = await pool.query(`
      SELECT ROUND(
        (SUM(collected_amount) / NULLIF(SUM(invoice_amount), 0) * 100)::numeric, 2
      ) as rate FROM provider_master_data
    `);
    console.log(`   Collection Rate: ${collectionRate.rows[0].rate}%`);

    const lawFirms = await pool.query('SELECT COUNT(DISTINCT law_firm_name) FROM provider_master_data');
    console.log(`   Law Firms: ${lawFirms.rows[0].count}`);

    const cases = await pool.query('SELECT COUNT(DISTINCT opportunity_name) FROM provider_master_data');
    console.log(`   Unique Cases: ${cases.rows[0].count}\n`);

    console.log('✨ Real TPG data ready!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

importRealData();
