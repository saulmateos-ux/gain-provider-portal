/**
 * Restore Database Backup
 *
 * This script restores a backup created by import-jeff-excel.js
 *
 * Usage:
 *   node scripts/restore-backup.js [backup-file-path]
 *
 * Example:
 *   node scripts/restore-backup.js ../Data/backups/provider_master_data_backup_2025-12-10.json
 */

require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function restoreBackup(backupFilePath) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Restore Database Backup                                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const client = await pool.connect();

  try {
    // Validate backup file
    console.log('📂 Validating backup file...');
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`);
    }

    const stats = fs.statSync(backupFilePath);
    console.log(`   ✅ File found: ${backupFilePath}`);
    console.log(`   📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

    // Load backup
    console.log('📖 Loading backup data...');
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backup = JSON.parse(backupContent);

    console.log(`   ✅ Backup loaded`);
    console.log(`   📅 Export Date: ${backup.exportDate}`);
    console.log(`   📊 Records: ${backup.recordCount}\n`);

    // Confirmation prompt
    console.log('⚠️  WARNING: This will ERASE all current data and restore from backup!');
    console.log(`   Current database will be replaced with ${backup.recordCount} records from backup.\n`);

    // In a real scenario, you'd want to add a confirmation prompt here
    // For now, we'll proceed automatically

    // Clear existing data
    console.log('🗑️  Clearing current data...');
    await client.query('TRUNCATE TABLE provider_master_data RESTART IDENTITY CASCADE');
    console.log('   ✅ Table truncated\n');

    // Restore data
    console.log('♻️  Restoring data...');

    const insertSQL = `
      INSERT INTO provider_master_data (
        salesforce_id, funding_id, patient_name, patient_dob,
        opportunity_id, opportunity_name, date_of_accident,
        law_firm_id, law_firm_name, attorney_name,
        provider_id, provider_name, location_id, location_name, region, state,
        invoice_amount, collected_amount, write_off_amount, open_balance,
        invoice_date, origination_date, settlement_date, collection_date, cap_date,
        funding_stage, funding_sub_stage, case_status, payoff_status,
        is_write_off, write_off_reason,
        tranche_id, tranche_name, ar_book_id, ar_book_name, ar_type,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38
      )
    `;

    let restored = 0;
    let errors = 0;

    for (const record of backup.data) {
      try {
        await client.query(insertSQL, [
          record.salesforce_id,
          record.funding_id,
          record.patient_name,
          record.patient_dob,
          record.opportunity_id,
          record.opportunity_name,
          record.date_of_accident,
          record.law_firm_id,
          record.law_firm_name,
          record.attorney_name,
          record.provider_id,
          record.provider_name,
          record.location_id,
          record.location_name,
          record.region,
          record.state,
          record.invoice_amount,
          record.collected_amount,
          record.write_off_amount,
          record.open_balance,
          record.invoice_date,
          record.origination_date,
          record.settlement_date,
          record.collection_date,
          record.cap_date,
          record.funding_stage,
          record.funding_sub_stage,
          record.case_status,
          record.payoff_status,
          record.is_write_off,
          record.write_off_reason,
          record.tranche_id,
          record.tranche_name,
          record.ar_book_id,
          record.ar_book_name,
          record.ar_type,
          record.created_at,
          record.updated_at,
        ]);

        restored++;

        if (restored % 100 === 0) {
          process.stdout.write(`   Restored ${restored}/${backup.recordCount} records...\r`);
        }
      } catch (err) {
        errors++;
        if (errors <= 5) {
          console.error(`\n   ⚠️  Error restoring record:`, err.message);
        }
      }
    }

    console.log(`\n   ✅ Restored ${restored} records`);
    if (errors > 0) {
      console.log(`   ⚠️  Failed ${errors} records\n`);
    } else {
      console.log();
    }

    // Refresh views
    console.log('🔄 Refreshing materialized views...');
    const viewsDir = path.join(__dirname, '../sql/views');

    if (fs.existsSync(viewsDir)) {
      const viewFiles = fs.readdirSync(viewsDir)
        .filter(f => f.endsWith('_mv.sql'))
        .sort();

      for (const viewFile of viewFiles) {
        try {
          const viewPath = path.join(viewsDir, viewFile);
          const sql = fs.readFileSync(viewPath, 'utf8');
          await client.query(sql);
          console.log(`   ✅ ${viewFile.replace('.sql', '')}`);
        } catch (err) {
          console.error(`   ❌ ${viewFile}:`, err.message);
        }
      }
    }

    console.log('\n✅ Restore completed successfully!\n');

    // Verify
    const verify = await client.query('SELECT COUNT(*) as count FROM provider_master_data');
    console.log(`📊 Verification: ${verify.rows[0].count} records in database\n`);

  } catch (error) {
    console.error('\n❌ RESTORE FAILED:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get backup file path from command line
const backupFilePath = process.argv[2];

if (!backupFilePath) {
  console.error('\n❌ Usage: node scripts/restore-backup.js [backup-file-path]');
  console.error('\nExample:');
  console.error('  node scripts/restore-backup.js ../Data/backups/provider_master_data_backup_2025-12-10.json\n');

  // List available backups
  const backupsDir = path.join(__dirname, '../../Data/backups');
  if (fs.existsSync(backupsDir)) {
    const backups = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('provider_master_data_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (backups.length > 0) {
      console.log('Available backups:');
      backups.slice(0, 10).forEach(backup => {
        const backupPath = path.join(backupsDir, backup);
        const stats = fs.statSync(backupPath);
        console.log(`  - ${backup} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      });
      console.log();
    }
  }

  process.exit(1);
}

// Resolve path
const resolvedPath = path.resolve(backupFilePath);
restoreBackup(resolvedPath);
