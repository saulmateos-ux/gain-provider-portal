# Active Work

## Current State (Updated 2025-12-10)

Both data sources now merged and loaded. All tabs functional.

## Data Currently Loaded

| Metric | Value |
|--------|-------|
| Total Opportunities | 1,488 |
| With collection_date | 506 |
| With open_balance > 0 | 654 |
| Total Invoiced | $5.18M |
| Total Collected | $2.99M |
| Total Open | $2.03M |
| Collection Rate | 57.8% |
| Source | Combined: TPG_Invoice.csv + TPG_Collections.csv |

## Pages & Status

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | Working | KPIs and aging chart |
| Collections | Working | Period selector, trends, velocity, law firm perf |
| Receivables | NEW | Aging analysis, top balances |
| Cases | Working | Case listing with pagination |
| Law Firms | Working | Law firm performance table |
| Tranches | Working | Tranche performance |
| Reports | Working | Export functionality |

## Recent Additions

### Collections Page
- Period selector (3m, 6m, 12m, YTD, All)
- Collection Velocity Trend chart (replaced Case Status)
- Charts display left-to-right chronologically

### Receivables Page (NEW)
- KPIs: Total Open AR, Open Invoices, Avg Days Outstanding, Past Due
- Aging Chart: AR by age buckets (0-30 through 365+ days)
- Top Balances Table: Groupable by Case, Law Firm, or Patient

## Import Scripts

| Script | Purpose | Use When |
|--------|---------|----------|
| `import-combined-data.js` | **PRIMARY** - Merges both CSVs | Default for full data |
| `import-collections-data.js` | Collections only | Testing collections features |
| `import-invoice-data.js` | Invoices only | Testing receivables features |

### To Refresh Data
```bash
cd provider-portal
node scripts/import-combined-data.js
```

## Potential Future Enhancements
1. Add export to Receivables page
2. Drill-down from aging buckets to case list
3. Settlement prediction based on case status
4. Email alerts for aging thresholds
