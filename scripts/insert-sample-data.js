/**
 * Insert Sample Data for Testing
 * Creates realistic test data for Therapy Partners Group
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WGcTRM9Oefd8@ep-withered-violet-a47xek4z-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function insertSampleData() {
  console.log('🚀 Inserting sample data...\n');

  try {
    // Sample law firms
    const lawFirms = [
      { id: 'LF001', name: 'BD&J, PC', attorney: 'John Smith' },
      { id: 'LF002', name: 'Smith & Associates', attorney: 'Jane Doe' },
      { id: 'LF003', name: 'Legal Partners LLP', attorney: 'Bob Johnson' }
    ];

    // Sample data for provider_master_data
    const sampleRecords = [];
    const caseStatuses = ['Active', 'Settled', 'In Progress', 'Pending Settlement'];
    const payoffStatuses = ['Unpaid', 'Partially Paid', 'Paid in Full'];

    // Generate 50 sample invoices
    for (let i = 1; i <= 50; i++) {
      const lawFirm = lawFirms[i % lawFirms.length];
      const invoiceAmount = Math.random() * 50000 + 5000;
      const collectionRate = Math.random() * 0.5 + 0.4; // 40-90%
      const collectedAmount = invoiceAmount * collectionRate;
      const openBalance = invoiceAmount - collectedAmount;
      const daysOld = Math.floor(Math.random() * 365);
      const invoiceDate = new Date();
      invoiceDate.setDate(invoiceDate.getDate() - daysOld);

      sampleRecords.push({
        salesforce_id: `SF${String(i).padStart(6, '0')}`,
        funding_id: `FD${String(i).padStart(6, '0')}`,
        patient_name: `Patient ${i}`,
        opportunity_id: `OPP${String(i).padStart(6, '0')}`,
        opportunity_name: `Case ${i} - Personal Injury`,
        date_of_accident: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        law_firm_id: lawFirm.id,
        law_firm_name: lawFirm.name,
        attorney_name: lawFirm.attorney,
        provider_id: 'TPG001',
        provider_name: 'Therapy Partners Group',
        location_id: 'LOC001',
        location_name: 'Main Location',
        region: 'West',
        state: 'CA',
        invoice_amount: invoiceAmount.toFixed(2),
        collected_amount: collectedAmount.toFixed(2),
        write_off_amount: 0,
        open_balance: openBalance.toFixed(2),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        origination_date: invoiceDate.toISOString().split('T')[0],
        settlement_date: null,
        collection_date: collectedAmount > 0 ? invoiceDate.toISOString().split('T')[0] : null,
        funding_stage: 'Partial Advance',
        case_status: caseStatuses[i % caseStatuses.length],
        payoff_status: payoffStatuses[i % payoffStatuses.length],
        tranche_id: `TR${Math.floor(i / 10) + 1}`,
        tranche_name: `Tranche ${Math.floor(i / 10) + 1}`,
        ar_book_name: 'TPG AR Book 1',
        ar_type: 'Medical Receivables'
      });
    }

    console.log(`📝 Generated ${sampleRecords.length} sample records`);

    // Insert records
    let inserted = 0;
    for (const record of sampleRecords) {
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
        record.salesforce_id, record.funding_id, record.patient_name,
        record.opportunity_id, record.opportunity_name, record.date_of_accident,
        record.law_firm_id, record.law_firm_name, record.attorney_name,
        record.provider_id, record.provider_name, record.location_id,
        record.location_name, record.region, record.state,
        record.invoice_amount, record.collected_amount, record.write_off_amount,
        record.open_balance, record.invoice_date, record.origination_date,
        record.settlement_date, record.collection_date, record.funding_stage,
        record.case_status, record.payoff_status, record.tranche_id,
        record.tranche_name, record.ar_book_name, record.ar_type
      ];

      await pool.query(sql, values);
      inserted++;
      if (inserted % 10 === 0) {
        console.log(`   ✓ Inserted ${inserted}/${sampleRecords.length} records`);
      }
    }

    console.log(`\n✅ Successfully inserted ${inserted} records\n`);

    // Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    await pool.query('SELECT * FROM refresh_all_materialized_views()');
    console.log('   ✅ Views refreshed\n');

    // Show summary
    console.log('📊 Database Summary:');
    const count = await pool.query('SELECT COUNT(*) FROM provider_master_data');
    console.log(`   Total Records: ${count.rows[0].count}`);

    const totalInvoiced = await pool.query('SELECT SUM(invoice_amount) as total FROM provider_master_data');
    console.log(`   Total Invoiced: $${parseFloat(totalInvoiced.rows[0].total).toLocaleString()}`);

    const totalCollected = await pool.query('SELECT SUM(collected_amount) as total FROM provider_master_data');
    console.log(`   Total Collected: $${parseFloat(totalCollected.rows[0].total).toLocaleString()}`);

    const openAR = await pool.query('SELECT SUM(open_balance) as total FROM provider_master_data');
    console.log(`   Open AR: $${parseFloat(openAR.rows[0].total).toLocaleString()}\n`);

    console.log('✨ Sample data ready!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

insertSampleData();
