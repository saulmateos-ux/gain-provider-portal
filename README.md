# GAIN Enhanced Provider Portal

Transform GAIN's provider portal from a reporting tool to an AI-enhanced optimization engine.

## Project Status

**Phase 1: Foundation** - ✅ Complete
- Database schema with materialized views
- Core API routes (health, KPI, aging, law firms)
- Dashboard with KPI cards and aging analysis
- Authentication with Clerk
- Data import pipeline

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Recharts
- **Backend**: Next.js API Routes, PostgreSQL (Neon), pg
- **Auth**: Clerk (restricted mode)
- **Deployment**: Vercel
- **Data**: Materialized views for performance

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- Clerk account (free tier works)

### 1. Clone and Install

```bash
cd provider-portal
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run SQL scripts in order:

```bash
# 1. Create master table
psql $DATABASE_URL < sql/schema/001_create_master_table.sql

# 2. Create indexes
psql $DATABASE_URL < sql/schema/002_create_indexes.sql

# 3. Create lookup tables
psql $DATABASE_URL < sql/schema/003_create_lookup_tables.sql

# 4. Create materialized views
psql $DATABASE_URL < sql/views/provider_kpi_summary_mv.sql
psql $DATABASE_URL < sql/views/aging_analysis_mv.sql
psql $DATABASE_URL < sql/views/law_firm_performance_mv.sql
psql $DATABASE_URL < sql/views/case_status_distribution_mv.sql
psql $DATABASE_URL < sql/views/tranche_performance_mv.sql

# 5. Create refresh function
psql $DATABASE_URL < sql/functions/refresh_all_views.sql
```

### 4. Import Data

```bash
node scripts/upload-data.js path/to/your/data.csv
```

Then refresh materialized views:

```bash
psql $DATABASE_URL -c "SELECT * FROM refresh_all_materialized_views();"
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Critical Rules

### 🚨 NEVER BREAK THESE

1. **NO FRONTEND CALCULATIONS** - ALL math in PostgreSQL
2. **DATABASE-FIRST** - Single source of truth
3. **USE SHARED POOL** - Import from `lib/db.ts` only
4. **STANDARDIZED FIELDS** - Use `invoice_amount`, `collected_amount`, `open_balance`, `collection_rate`, `dso_days`
5. **WRAP CLERK IN SUSPENSE** - Always use Suspense boundaries
6. **INDEX JOIN COLUMNS** - Before deploying queries with JOINs
7. **REFRESH VIEWS** - After data imports/updates
8. **TEST BUILDS** - `rm -rf .next && npm run build` before deployment

## Architecture

### Database-First Pattern

```
Raw Data → provider_master_data (master table)
         ↓
Materialized Views (pre-computed metrics)
         ↓
API Routes (fetch only, no calculations)
         ↓
React Components (display only)
```

### Key Files

- `lib/db.ts` - **Singleton database pool** (CRITICAL)
- `lib/design-tokens.ts` - GAIN brand colors
- `lib/formatters.ts` - Number/currency/date formatting
- `lib/validators.ts` - Zod schemas

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/kpi` | GET | KPI summary |
| `/api/aging` | GET | Aging analysis |
| `/api/law-firms` | GET | Law firm performance |
| `/api/import-chunk` | POST | Chunked data import |

## Commands

```bash
# Development
npm run dev

# Type checking
npm run type-check

# Build (ALWAYS test before deployment)
rm -rf .next && npm run build

# Production
npm run start
```

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Database Migrations

After deployment, refresh materialized views:

```bash
psql $DATABASE_URL -c "SELECT * FROM refresh_all_materialized_views();"
```

## Performance Targets

| Metric | Target | Max |
|--------|--------|-----|
| Dashboard load | <2s | <5s |
| API response (p95) | <2s | <5s |
| Materialized view refresh | <30s | <60s |

## Troubleshooting

### Build Failures

```bash
# Clean build
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues

Check `DATABASE_URL` has `?sslmode=require` suffix

### Clerk SSR Errors

Ensure all Clerk components wrapped in `<Suspense>`

## Documentation

- **CLAUDE.md** - Project constitution and rules
- **EXECUTION_PLAN.md** - 4-phase implementation plan
- **PRD_Enhanced_Provider_Portal.md** - Business requirements
- **TECHNICAL_SPECIFICATIONS.md** - Technical details
- **DESIGN_SPECIFICATIONS.md** - UI/UX standards

## Support

For issues or questions:
1. Check CLAUDE.md for critical rules
2. Review EXECUTION_PLAN.md for implementation guidance
3. Check database connection and materialized view freshness

---

**Built with database-first architecture for performance and accuracy**
