# Collections Page Enhancement Plan

## Executive Summary

**Current State**: A simple monthly table showing basic collection trends
**Target State**: A comprehensive collections analytics dashboard with visualizations, KPIs, and actionable insights

---

## Current Page Analysis

### What Exists Today
- Monthly table with 5 columns (Month, Invoices, Total Invoiced, Total Collected, Open Balance, Collection Rate)
- Basic color coding (green for collected, orange for open balance)
- No visualizations
- No summary KPIs
- No filtering capabilities
- No breakdown by meaningful dimensions

### Data Available (Not Currently Used)
- 512 law firms with varying collection rates (45% to 100%)
- 11 case statuses affecting collectibility
- 8 payoff statuses
- Settlement dates, collection dates
- Write-off tracking ($151K in write-offs)
- Tranche/AR book segmentation

---

## Proposed Enhancements

### Section 1: Summary KPI Cards (Top of Page)

**4 Primary KPIs:**

| KPI | Value | Description |
|-----|-------|-------------|
| **Total Collected (YTD)** | $2,993,638 | Sum of all collections year-to-date |
| **Collection Rate** | 57.8% | (Total Collected / Total Invoiced) × 100 |
| **Invoices Collected** | 8,548 / 14,780 | Count of invoices with any collection |
| **Average Days to Collect** | TBD | Avg(collection_date - invoice_date) |

**Design**: 4 cards in a row, matching dashboard style
- Large number display
- Small trend indicator (vs prior period)
- Subtle icon

---

### Section 2: Collection Trends Visualization

**Chart Type**: Combo Chart (Bar + Line)

**X-Axis**: Monthly (last 12 months)
**Primary Y-Axis (Bars)**:
- Stacked bars showing:
  - Collected Amount (green)
  - Open Balance (orange/amber)
  - Write-offs (red, if applicable)

**Secondary Y-Axis (Line)**:
- Collection Rate % (teal line with markers)

**Why This Matters**:
- Shows volume AND rate together
- Reveals if collection rate is improving even when volumes fluctuate
- Identifies seasonal patterns

**Implementation**: Recharts `ComposedChart` with `Bar` (stacked) + `Line`

---

### Section 3: Collection Rate Distribution

**Chart Type**: Horizontal Bar Chart

**Purpose**: Show collection rate by case status

**Data Points**:
| Case Status | Invoices | Collection Rate |
|-------------|----------|-----------------|
| Case Closed Payment Disbursed | 1,891 | ~95%+ |
| Settled - Not Yet Disbursed | 4,941 | ~60-70% |
| In Litigation | 2,449 | ~30-40% |
| Still Treating | 1,347 | ~20-30% |
| Pending | 1,096 | ~10-20% |

**Why This Matters**:
- Shows WHERE collection problems exist
- Identifies which case statuses need attention
- Guides prioritization of collection efforts

---

### Section 4: Invoice Status Funnel

**Chart Type**: Funnel or Waterfall Chart

**Flow**:
```
Total Invoiced ($5.18M)
    ↓
Collected ($2.99M) ─────────→ 57.8%
    ↓
Open Balance ($2.03M) ──────→ 39.3%
    ↓
Written Off ($151K) ────────→ 2.9%
```

**Why This Matters**:
- Shows the "money flow" at a glance
- Highlights write-off rate (important risk metric)
- Simple but powerful visualization

---

### Section 5: Collection Performance by Law Firm (Top 10)

**Chart Type**: Horizontal Bar Chart with Collection Rate Overlay

**Columns**:
| Law Firm | Invoice Count | Total Invoiced | Collected | Collection Rate |
|----------|---------------|----------------|-----------|-----------------|
| BD&J, PC | X | $Y | $Z | 45.5% |
| Law Brothers | X | $Y | $Z | 87.4% |
| ... | ... | ... | ... | ... |

**Sorting Options**:
- By Total Collected (default)
- By Collection Rate
- By Open Balance (descending - problem firms)

**Why This Matters**:
- Identifies high-performing law firms to prioritize
- Exposes low-performing firms for intervention
- Critical for relationship management

---

### Section 6: Monthly Trends Table (Enhanced)

**Keep existing table but enhance:**

1. **Add Sparklines**: Mini trend charts in each row
2. **Add MoM Change**: +/- percentage vs prior month
3. **Add YoY Comparison**: Same month last year
4. **Highlight Anomalies**: Red/green highlighting for outliers

**Additional Columns**:
- Write-off Amount
- Net Collection Rate (excluding write-offs)
- Invoice Count Collected (not just total invoices)

---

### Section 7: Collection Velocity Metrics

**New Metrics to Calculate**:

| Metric | Formula | Business Value |
|--------|---------|----------------|
| **Average Collection Cycle** | Avg(collection_date - invoice_date) | How long it takes to collect |
| **Collected Invoice Rate** | Invoices Collected / Total Invoices | % of invoices with ANY collection |
| **Full Collection Rate** | Fully Collected / Total Invoices | % of invoices FULLY collected |
| **DSO (Days Sales Outstanding)** | (Open Balance / Avg Daily Collections) | AR efficiency |

---

## Technical Implementation

### New API Endpoints

```typescript
// 1. Enhanced collections summary
GET /api/collections/summary
Returns: { totalCollected, collectionRate, invoicesCollected, avgDaysToCollect, writeOffRate }

// 2. Collections by case status
GET /api/collections/by-status
Returns: [{ status, invoiceCount, invoiced, collected, rate }]

// 3. Collections by law firm
GET /api/collections/by-law-firm?limit=10&sortBy=collected
Returns: [{ lawFirm, invoiceCount, invoiced, collected, rate, openBalance }]

// 4. Collection velocity metrics
GET /api/collections/velocity
Returns: { avgCollectionDays, medianCollectionDays, dso }
```

### New Materialized Views

```sql
-- collections_by_status_mv
-- collections_by_law_firm_mv
-- collection_velocity_mv
```

### Frontend Components

```
/components/collections/
├── CollectionsSummaryKPIs.tsx
├── CollectionsTrendChart.tsx
├── CollectionsByStatusChart.tsx
├── CollectionsFunnel.tsx
├── LawFirmPerformanceTable.tsx
└── EnhancedTrendsTable.tsx
```

---

## Priority Order (Recommended)

### Phase 1: Quick Wins (High Impact, Lower Effort)
1. **Summary KPI Cards** - Immediate value, simple to implement
2. **Collection Trends Combo Chart** - Replaces boring table with insight
3. **Enhanced Table** - Add MoM change column

### Phase 2: Deep Analytics
4. **Collections by Case Status** - Critical for prioritization
5. **Law Firm Performance** - Relationship management
6. **Collection Funnel** - Executive-level view

### Phase 3: Advanced Metrics
7. **Collection Velocity** - Requires calculation logic
8. **Predictive Insights** - ML-based likelihood scoring

---

## Visual Design Guidelines

### Color Palette
- **Collected/Positive**: `#10B981` (green)
- **Open/Pending**: `#F59E0B` (amber)
- **Write-offs/Negative**: `#EF4444` (red)
- **Neutral/Info**: `#3B82F6` (blue)
- **Brand Accent**: `#1E8E8E` (GAIN teal)

### Chart Styling
- Clean white backgrounds
- Subtle grid lines
- Rounded corners on bars
- Consistent axis formatting
- Interactive tooltips

### Responsive Design
- KPI cards: 4 → 2 → 1 columns on smaller screens
- Charts: Full width, responsive height
- Tables: Horizontal scroll on mobile

---

## Success Metrics

After implementation, track:
1. **Page engagement**: Time on page, scroll depth
2. **Action rate**: Clicks to law firm details, exports
3. **User feedback**: NPS improvement
4. **Business impact**: Collection rate improvement over time

---

## Questions to Resolve

1. Should we show ALL law firms or just top/bottom performers?
2. Do we want real-time data or is daily refresh acceptable?
3. Should law firm names be clickable to a detail page?
4. Do we need export to Excel functionality on this page?
5. Should we add date range filters (last 3/6/12 months)?

---

## Next Steps

1. Review this plan with stakeholders
2. Prioritize which enhancements to build first
3. Create SQL queries for new materialized views
4. Build API endpoints
5. Implement frontend components
6. Test and iterate

---

*Document prepared for GAIN Provider Portal Enhancement*
*Date: December 9, 2025*
