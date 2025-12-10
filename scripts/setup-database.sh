#!/bin/bash

# Setup Database Script
# Runs all SQL schema files in the correct order

set -e  # Exit on error

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "   Set it with: export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "🗄️  Setting up GAIN Provider Portal database..."
echo ""

echo "📋 Step 1/9: Creating master data table..."
psql $DATABASE_URL -f sql/schema/001_create_master_table.sql

echo "📋 Step 2/9: Creating indexes..."
psql $DATABASE_URL -f sql/schema/002_create_indexes.sql

echo "📋 Step 3/9: Creating lookup tables..."
psql $DATABASE_URL -f sql/schema/003_create_lookup_tables.sql

echo "📋 Step 4/9: Creating KPI summary view..."
psql $DATABASE_URL -f sql/views/provider_kpi_summary_mv.sql

echo "📋 Step 5/9: Creating aging analysis view..."
psql $DATABASE_URL -f sql/views/aging_analysis_mv.sql

echo "📋 Step 6/9: Creating law firm performance view..."
psql $DATABASE_URL -f sql/views/law_firm_performance_mv.sql

echo "📋 Step 7/9: Creating case status distribution view..."
psql $DATABASE_URL -f sql/views/case_status_distribution_mv.sql

echo "📋 Step 8/9: Creating tranche performance view..."
psql $DATABASE_URL -f sql/views/tranche_performance_mv.sql

echo "📋 Step 9/9: Creating refresh function..."
psql $DATABASE_URL -f sql/functions/refresh_all_views.sql

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Seed sample data: node scripts/seed-sample-data.js"
echo "   2. Start dev server: npm run dev"
echo "   3. Open browser: http://localhost:3000"
