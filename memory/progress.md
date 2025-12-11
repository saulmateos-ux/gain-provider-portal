# Progress Log

## 2025-12-10 - Collection Rate Formula & Data Source Fix

### What
Fixed the Collection Rate calculation and data source to show real collection rates (40-60% range) instead of fake 100% rates.

### Why
The original data source (`TPG_Invoice.csv`) had collection amounts that always equaled invoice amounts - showing 100% collection rate which is unrealistic. In healthcare receivables, law firms negotiate reductions of 40-60% on medical liens.

### Changes Made

**Data Source**
- Identified correct data source: `TPG_Collections.csv`
- This file has both `Total Invoice Amount` AND `Total Amount Collected`
- Contains 4,963 invoice records with actual collection amounts
- Overall collection rate: 62.9% (37.1% reduction) - realistic!

**New Import Script**
- Created: `scripts/import-collections-data.js`
- Reads TPG_Collections.csv and aggregates by opportunity
- Imports 506 collected opportunities with real amounts
- Stores reduction amount in `write_off_amount` field

**Formula Updates**
- Updated `/api/collections/route.ts`
- Updated `provider_kpi_summary_mv.sql`
- Updated `law_firm_performance_mv.sql`
- Updated `tranche_performance_mv.sql`
- New formula: `Collection Rate = Collected / Invoice Amount`

**UI Changes**
- Removed "Open Balance" from Collection Trends chart
- Chart now shows only Collected bars + Collection Rate line

### Files Changed
- `app/api/collections/route.ts` - Updated collection rate formula
- `sql/views/provider_kpi_summary_mv.sql` - Updated formula
- `sql/views/law_firm_performance_mv.sql` - Updated formula + performance tier
- `sql/views/tranche_performance_mv.sql` - Updated formula
- `components/collections/CollectionsTrendChart.tsx` - Removed Open Balance bar
- `scripts/import-collections-data.js` - NEW: Import real collections data
- `scripts/import-invoice-data.js` - Created but replaced by collections import
- `scripts/update-collection-rate-formula.js` - Refresh materialized views

### Results
- Collection rates now range from 34% to 82% by month
- Overall portfolio: 62.9% collection rate
- Data matches business expectation of 40-60% reductions

### Next Steps
- ~~May need to combine with open invoice data for complete portfolio view~~ DONE
- ~~Consider adding collection date trends~~ DONE

---

## 2025-12-10 - Collections Page Enhancements & Receivables Tab

### What
Major enhancements to Collections page + new Receivables tab for AR aging analysis.

### Changes Made

**1. Fixed Collection Trends Chart Date Issue**
- Changed API from `invoice_date` to `collection_date` for accurate trend visualization
- Chart now shows when money was actually collected, not when invoiced
- File: `app/api/collections/route.ts`

**2. Added Period Selector to Collections Page**
- Added dropdown with: Last 3 months, Last 6 months, Last 12 months, Year to date, All time
- All collection APIs now support `?period=` parameter
- Period filter applies to all charts and KPIs on the page
- Files modified:
  - `app/(dashboard)/collections/page.tsx`
  - `app/api/collections/route.ts`
  - `app/api/collections/summary/route.ts`
  - `app/api/collections/by-status/route.ts`
  - `app/api/collections/by-law-firm/route.ts`

**3. Fixed Chart Direction**
- Collection Trends chart now displays left-to-right (oldest on left, most recent on right)
- Removed `.reverse()` from chart component
- File: `components/collections/CollectionsTrendChart.tsx`

**4. Updated KPI Card Labels**
- Changed "Total Collected (YTD)" to "Total Collected" (dynamic based on period)
- Changed "Invoices Collected" display from "X / Y" to just "X" with subtitle
- File: `components/collections/CollectionsSummaryKPIs.tsx`

**5. Created Collection Velocity Trend Chart** (NEW)
- Shows average days from invoice to collection over time
- Replaced "Collections by Case Status" chart
- Shows trend indicator (improving/worsening)
- Includes avg days line, median days line, and collections count bars
- Summary stats: Latest Avg, Period Avg, Best Month
- Files created:
  - `app/api/collections/velocity/route.ts`
  - `components/collections/CollectionVelocityTrend.tsx`

**6. Created New Receivables Tab** (NEW)
- Added "Receivables" navigation item between Collections and Cases
- Purpose: Shows open AR (forward-looking) vs Collections (historical)
- Features:
  - KPIs: Total Open AR, Open Invoices, Avg Days Outstanding, Past Due Amount
  - Aging Chart: Horizontal bar showing AR by age buckets (0-30, 31-60, 61-90, 91-180, 181-365, 365+ days)
  - Top Balances Table: Largest outstanding receivables, groupable by Case/Law Firm/Patient
- Files created:
  - `app/(dashboard)/receivables/page.tsx`
  - `app/api/receivables/summary/route.ts`
  - `app/api/receivables/aging/route.ts`
  - `app/api/receivables/top-balances/route.ts`
  - `components/receivables/ReceivablesSummaryKPIs.tsx`
  - `components/receivables/AgingChart.tsx`
  - `components/receivables/TopBalancesTable.tsx`
- Modified: `components/layout/Header.tsx` (added nav item with Wallet icon)

**7. Created Combined Data Import Script** (NEW)
- Imports BOTH TPG_Invoice.csv AND TPG_Collections.csv
- Merges datasets by opportunity name
- TPG_Collections provides `collection_date` for trend analysis
- TPG_Invoice provides `open_balance` for receivables analysis
- File: `scripts/import-combined-data.js`

### Data Summary After Combined Import
| Metric | Value |
|--------|-------|
| Total Opportunities | 1,488 |
| With collection_date | 506 |
| With open_balance > 0 | 654 |
| Total Invoiced | $5.18M |
| Total Collected | $2.99M |
| Total Open | $2.03M |
| Collection Rate | 57.8% |

### Architecture Decisions
- Collections page filters on `collection_date` for time-based analysis
- Receivables page filters on `invoice_date` for aging calculations
- Both datasets merged by `opportunity_name` as primary key
- Period selector affects all APIs on Collections page consistently

---

## 2025-12-10 - PI-Specific Receivables Section Complete Redesign

### What
**MAJOR TRANSFORMATION**: Redesigned the entire Receivables section from traditional aging-based analysis to **Personal Injury-specific litigation pipeline analysis**.

### Why
Traditional healthcare RCM approaches don't work for Personal Injury:
- **Traditional**: Collection depends on days since invoice (30/60/90 aging)
- **Personal Injury**: Collection depends on **lawsuit settlement outcome**, not invoice age
- Cases take 17+ months on average - almost ALL would be "past due" by traditional standards
- What matters: **Where is the case in the litigation pipeline?**

### Key Insight
The case **STATUS** determines if you'll collect, not how old the invoice is!
- "In Litigation" = active lawsuit, outcome uncertain
- "Settled - Not Yet Disbursed" = **MONEY ALREADY WON!** (unique to PI)
- "No Longer Represent" = attorney dropped case = likely write-off

### Changes Made

**1. Created 3 New Materialized Views**
- `receivables_by_case_status_mv.sql` - Groups open AR by litigation stage (8 stages)
  - Still Treating, Gathering Bills, Demand Sent, Pending, Negotiation, In Litigation
  - Settled - Not Yet Disbursed (money won!), No Longer Represent (at risk)
  - Includes aggregates: active_litigation_ar, at_risk_ar
- `settled_pending_detail_mv.sql` - Cases that have SETTLED but payment not disbursed
  - Tracks days since settlement, payoff status (Cap/Reduction)
  - Case-level detail for money already won
- `at_risk_ar_mv.sql` - Write-off candidates by risk category
  - No Longer Represent, Pending 18+ months, Cases 36+ months old
  - Risk scoring and categorization

**2. Created 3 New API Endpoints**
- `/api/receivables/by-case-status` - Returns AR grouped by litigation stage with colors
- `/api/receivables/settled-pending` - Returns settled cases awaiting payment
- `/api/receivables/at-risk` - Returns at-risk AR with risk categories

**3. Updated Receivables Summary API**
- Enhanced `/api/receivables/summary` with PI-specific metrics:
  - `settledPendingAR` / `settledPendingCases` - Money already won
  - `activeLitigationAR` / `activeLitigationCases` - Cases in progress
  - `atRiskAR` / `atRiskCases` - Write-off candidates

**4. Created 3 New React Components**
- `CaseStatusPipeline.tsx` - Horizontal bar chart showing AR by litigation stage
  - Color-coded: Green (won), Blue (active), Yellow (early), Amber (ambiguous), Red (at risk)
  - Interactive tooltips with case counts, invoice counts, percentages
  - Legend explaining PI-specific stages
- `SettledPendingTable.tsx` - Table of cases that have settled (money won!)
  - Green highlight, summary cards (total AR won, avg wait time, case count)
  - Breakdown by payoff status (Cap vs Reduction Accepted)
  - Days since settlement tracking with color coding
  - Top 20 cases sorted by open balance
- `AtRiskARCard.tsx` - At-risk AR analysis with write-off candidates
  - Red/warning styling, risk category breakdown
  - Top 10 at-risk cases table with risk indicators
  - Recommended actions by category

**5. Completely Rewrote KPI Cards**
- `ReceivablesSummaryKPIs.tsx` - Changed from 4 traditional metrics to 4 PI-specific:
  1. **Total Open AR** - All receivables across all stages
  2. **Settled, Awaiting Payment** - Money already WON (green highlight!)
  3. **Active Litigation** - In Litigation + Negotiation stages
  4. **At-Risk AR** - No Longer Represent + Pending (write-off candidates)

**6. Complete Page Redesign**
- `app/(dashboard)/receivables/page.tsx` - Total rewrite
- **Removed**: Traditional 30/60/90 day aging buckets (irrelevant for PI)
- **Added**:
  - PI-specific KPI cards
  - Case Status Pipeline as PRIMARY visualization
  - Settled Pending section (money won highlight)
  - At-Risk AR section
  - Footer note explaining why traditional aging doesn't apply

**7. Created Helper Script**
- `scripts/create-receivables-views.js` - Creates all 3 materialized views
- Loads env from .env.local, refreshes views after creation

**8. Documentation**
- `RECEIVABLES_PI_IMPLEMENTATION.md` - Complete technical documentation
  - Current state assessment, business value, technical details
  - Implementation phases, files changed, key insights

### Files Changed
**SQL Views (3 new):**
- `sql/views/receivables_by_case_status_mv.sql`
- `sql/views/settled_pending_detail_mv.sql`
- `sql/views/at_risk_ar_mv.sql`

**API Routes (3 new, 1 modified):**
- `app/api/receivables/by-case-status/route.ts` (NEW)
- `app/api/receivables/settled-pending/route.ts` (NEW)
- `app/api/receivables/at-risk/route.ts` (NEW)
- `app/api/receivables/summary/route.ts` (MODIFIED - added PI metrics)

**Components (4 new):**
- `components/receivables/CaseStatusPipeline.tsx` (NEW)
- `components/receivables/SettledPendingTable.tsx` (NEW)
- `components/receivables/AtRiskARCard.tsx` (NEW)
- `components/receivables/ReceivablesSummaryKPIs.tsx` (REWRITTEN)

**Pages (1 rewritten):**
- `app/(dashboard)/receivables/page.tsx` (COMPLETE REWRITE)

**Scripts (1 new):**
- `scripts/create-receivables-views.js`

**Documentation (1 new):**
- `RECEIVABLES_PI_IMPLEMENTATION.md`

### Real Data Results (After Implementation)
| Metric | Value | Insight |
|--------|-------|---------|
| Total Open AR | $2.03M | 604 cases |
| Settled, Awaiting Payment | **$96K** | **37 cases - money already won!** |
| Active Litigation | $935K | 275 cases (47% of AR) |
| At-Risk AR | $318K | 101 cases (16% of AR) |
| In Litigation (largest) | $810K | 217 cases |
| Still Treating | $316K | 113 cases |
| Pending (ambiguous) | $304K | 95 cases |
| No Longer Represent | $13K | 6 cases (write-off candidates) |

### Business Impact
**Before**: Traditional aging view showed almost all invoices as "past due" (meaningless for PI)

**After**:
- Clear visibility into litigation pipeline composition
- **Unique PI insight**: $96K already won, just waiting for disbursement
- Proactive identification of $318K at-risk AR
- Actionable data: 95 cases stuck in ambiguous "Pending" status need attention
- Visual representation of where money is in the legal system

### Architecture Pattern Established
This PI-specific approach can now be applied to other sections:
- **Law Firms**: Performance by case stage, not just collection rate
- **Cases**: Progress through litigation pipeline, not just age
- **Tranches**: Performance by case status mix, not just IRR

### Color Coding System (Standardized)
- 🟢 Green: Settled - Not Yet Disbursed (money won!)
- 🔵 Blue: Active litigation/negotiation (in progress)
- 🟡 Yellow: Still Treating / Early Stage
- 🟠 Amber: Pending (ambiguous status)
- 🔴 Red: No Longer Represent (at risk / write-off)

### Next Steps
- Apply similar PI-specific analysis to Law Firms section
- Add historical trending (how has pipeline composition changed over time?)
- Add ML predictions for settlement probability by stage
- Create alerts for cases stuck in same status for extended periods
