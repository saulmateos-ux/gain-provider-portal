# Personal Injury Receivables Implementation

## Overview

This document describes the PI-specific receivables implementation that transforms the traditional aging-based receivables view into a **litigation-stage-based** analysis appropriate for Personal Injury receivables.

## Key Insight

**Traditional RCM Receivables**: Collection depends on days since invoice (30/60/90 day aging)

**Personal Injury Receivables**: Collection depends on **case settlement outcome** - not invoice age!

## Implementation Summary

### 1. New Database Views (3)

#### `receivables_by_case_status_mv`
Groups open AR by litigation pipeline stage:
- Still Treating
- Gathering Bills and Records
- Demand Sent
- Pending
- Negotiation
- In Litigation
- **Settled - Not Yet Disbursed** (money already won!)
- No Longer Represent (at risk)

Includes aggregates for:
- Active Litigation AR (Negotiation + In Litigation)
- At-Risk AR (No Longer Represent + Pending)

#### `settled_pending_detail_mv`
Cases that have **SETTLED** but payment not yet disbursed - unique to PI!
- This is money you've already WON
- Tracks days since settlement
- Groups by payoff status (Cap, Reduction Accepted, etc.)

#### `at_risk_ar_mv`
Write-off candidates:
- No Longer Represent cases (attorney dropped case)
- Pending cases for 18+ months
- Cases 36+ months old with no progress

### 2. New API Endpoints (3)

#### `GET /api/receivables/by-case-status`
Returns open AR grouped by litigation stage with percentages and colors

#### `GET /api/receivables/settled-pending`
Returns cases that have settled but not yet paid, with summary stats by payoff status

#### `GET /api/receivables/at-risk`
Returns at-risk cases grouped by risk category with recommended actions

### 3. Updated API Endpoint (1)

#### `GET /api/receivables/summary` (Enhanced)
Now includes PI-specific KPIs:
- `settledPendingAR` / `settledPendingCases`
- `activeLitigationAR` / `activeLitigationCases`
- `atRiskAR` / `atRiskCases`

### 4. New React Components (4)

#### `CaseStatusPipeline.tsx`
Horizontal bar chart showing open AR by case stage
- Color-coded by risk level (green = won, blue = active, red = at risk)
- Interactive tooltips with case counts and percentages
- Legend explaining PI-specific stages

#### `SettledPendingTable.tsx`
Table of cases that have settled but not paid
- Green highlight (money already won!)
- Summary cards showing total AR won, avg wait time, case count
- Breakdown by payoff status
- Days since settlement tracking

#### `AtRiskARCard.tsx`
At-risk AR analysis with write-off candidates
- Red/warning styling
- Risk category breakdown
- Top 10 at-risk cases table
- Avg case age in months

#### `ReceivablesSummaryKPIs.tsx` (Rewritten)
4 PI-specific KPI cards:
1. **Total Open AR** - All open receivables
2. **Settled, Awaiting Payment** - Money already WON (highlighted in green!)
3. **Active Litigation** - In Litigation + Negotiation stages
4. **At-Risk AR** - No Longer Represent + Pending (write-off candidates)

### 5. Updated Page

#### `app/(dashboard)/receivables/page.tsx` (Complete Rewrite)
New layout:
1. Page header with PI-specific description
2. 4 PI-specific KPI cards
3. Case Status Pipeline visualization (PRIMARY)
4. Settled Pending table (money won section)
5. At-Risk AR card (write-off candidates)
6. Footer note explaining why traditional aging doesn't apply

## Key Differences from Traditional Receivables

| Traditional RCM | Personal Injury (GAIN) |
|----------------|------------------------|
| Days since invoice matters | Case stage matters |
| 30/60/90 day aging buckets | Litigation pipeline stages |
| "Past due" = 90+ days | "At risk" = bad case status |
| DSO is critical metric | DSO is irrelevant |
| Customer pays invoice | Lawsuit settlement pays |
| Action: Send reminder | Action: Push attorney |

## Color Coding System

- 🟢 **Green**: Settled - Not Yet Disbursed (money already won!)
- 🔵 **Blue**: Active litigation/negotiation (cases in progress)
- 🟡 **Yellow**: Still Treating / Early Stage
- 🟠 **Amber**: Pending (ambiguous status)
- 🔴 **Red**: No Longer Represent (at risk / write-off candidate)

## Business Value

### "Settled - Awaiting Payment" Section
This is UNIQUE to PI receivables and incredibly important:
- Shows money you've already WON but haven't received yet
- Highlights cases waiting too long for disbursement
- Allows tracking by payoff status (Cap vs Reduction)

### At-Risk AR Section
Proactive write-off identification:
- "No Longer Represent" cases (attorney dropped - likely won't collect)
- Extremely old cases with no movement
- Ambiguous "Pending" status for extended periods

### Case Status Pipeline
Visual representation of where money is in the litigation process:
- Clear picture of litigation portfolio composition
- Identify bottlenecks (too many cases stuck in one stage)
- Track movement through the pipeline

## Next Steps

### Immediate (Testing)
1. Run SQL scripts to create materialized views
2. Refresh views with real data
3. Test API endpoints
4. Verify frontend displays correctly

### Phase 2 (Enhancements)
1. Add law firm breakdown by case status
2. Add historical trending (how has pipeline composition changed?)
3. Add expected collection rates by stage (based on historical data)
4. Add "time in current status" metric

### Phase 3 (Predictive)
1. ML model: predict settlement probability by case characteristics
2. ML model: predict time to settlement by stage
3. ML model: predict collection amount by payoff status
4. Risk scoring: calculate write-off probability

## Files Created/Modified

### SQL Views
- `sql/views/receivables_by_case_status_mv.sql`
- `sql/views/settled_pending_detail_mv.sql`
- `sql/views/at_risk_ar_mv.sql`

### API Routes
- `app/api/receivables/by-case-status/route.ts`
- `app/api/receivables/settled-pending/route.ts`
- `app/api/receivables/at-risk/route.ts`
- `app/api/receivables/summary/route.ts` (modified)

### Components
- `components/receivables/CaseStatusPipeline.tsx`
- `components/receivables/SettledPendingTable.tsx`
- `components/receivables/AtRiskARCard.tsx`
- `components/receivables/ReceivablesSummaryKPIs.tsx` (rewritten)

### Pages
- `app/(dashboard)/receivables/page.tsx` (complete rewrite)

## Technical Notes

- All calculations in PostgreSQL (database-first architecture)
- Materialized views for performance
- API routes are passthrough only (no calculations)
- Frontend components display pre-computed data
- Color scheme consistent across all visualizations
- Responsive design for mobile/tablet

---

**Built**: December 2025
**Purpose**: Transform traditional aging-based receivables into PI-specific litigation pipeline analysis
**Outcome**: Actionable insights based on case status, not invoice age
