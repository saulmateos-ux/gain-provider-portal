/**
 * Database Setup Script
 * Sets up all tables, indexes, views, and functions
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WGcTRM9Oefd8@ep-withered-violet-a47xek4z-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runSQLFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n📄 Running: ${path.basename(filePath)}`);

  try {
    await pool.query(sql);
    console.log(`   ✅ Success`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const result = await pool.query('SELECT version()');
    console.log(`   ✅ Connected to: ${result.rows[0].version.split(',')[0]}\n`);

    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'provider_master_data'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('⚠️  Table provider_master_data already exists');
      console.log('   This will DROP and recreate all tables!\n');
    }

    // 1. Schema files
    console.log('📊 Creating schema...');
    const schemaFiles = [
      'sql/schema/001_create_master_table.sql',
      'sql/schema/002_create_indexes.sql',
      'sql/schema/003_create_lookup_tables.sql'
    ];

    for (const file of schemaFiles) {
      const filePath = path.join(__dirname, '..', file);
      await runSQLFile(filePath);
    }

    // 2. Materialized views
    console.log('\n📈 Creating materialized views...');
    const viewFiles = [
      'sql/views/provider_kpi_summary_mv.sql',
      'sql/views/aging_analysis_mv.sql',
      'sql/views/law_firm_performance_mv.sql',
      'sql/views/case_status_distribution_mv.sql',
      'sql/views/tranche_performance_mv.sql'
    ];

    for (const file of viewFiles) {
      const filePath = path.join(__dirname, '..', file);
      await runSQLFile(filePath);
    }

    // 3. Functions
    console.log('\n⚙️  Creating functions...');
    await runSQLFile(path.join(__dirname, '..', 'sql/functions/refresh_all_views.sql'));

    // Verify setup
    console.log('\n🔍 Verifying setup...');

    const tables = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    console.log(`   ✅ Tables: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`      - ${row.tablename}`));

    const views = await pool.query(`
      SELECT matviewname FROM pg_matviews
      WHERE schemaname = 'public'
      ORDER BY matviewname
    `);
    console.log(`\n   ✅ Materialized Views: ${views.rows.length}`);
    views.rows.forEach(row => console.log(`      - ${row.matviewname}`));

    console.log('\n✨ Database setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Import data: node scripts/upload-data.js path/to/data.csv');
    console.log('   2. Refresh views: SELECT * FROM refresh_all_materialized_views();');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
