# Architectural Decisions

## 2025-12-10 - Collection Rate Definition

### Decision
Collection Rate = Collected Amount / Invoice Amount

### Context
In healthcare receivables (medical liens), when a case settles:
- Provider invoices $1,000 for services
- Law firm negotiates reduction
- Provider receives $600 (60% of invoice)
- This is the "collection rate" - typically 40-60%

### Rejected Alternatives
1. `Collected / (Collected + Open)` - Only makes sense for tracking pending collections
2. `Collected / Invoice for invoices with collected > 0` - Returns 100% when data has collected = invoiced

### Data Sources

**TPG_Collections.csv** (CORRECT for collection rate)
- Has both `Total Invoice Amount` and `Total Amount Collected`
- Shows actual amounts received after reductions
- Use for: Collection rate analysis, law firm performance

**TPG_Invoice.csv** (CORRECT for AR tracking)
- Has `Open Invoice`, `Settled`, `Write Off` columns
- But `Settled` = `Invoice` when collected (no reduction recorded)
- Use for: Open AR tracking, case status, pipeline

### Business Logic
- Once collected, case is done (no "open balance" concept)
- Reduction amount stored as `write_off_amount` in database
- Write-off here means "negotiated reduction", not bad debt

---

## 2025-12-10 - Collections vs Receivables Page Separation

### Decision
Created separate Receivables tab distinct from Collections tab.

### Context
- **Collections page**: Shows historical collection performance (money that came in)
- **Receivables page**: Shows current open AR state (money still owed)

### Rationale
1. Different time perspectives: Collections is backward-looking, Receivables is forward-looking
2. Different user needs: CFO wants collection trends, AR manager wants aging analysis
3. Different data requirements: Collections needs `collection_date`, Receivables needs `invoice_date`
4. Keeps each page focused and not overcrowded

### Data Strategy
- `collection_date` used for Collections page filtering (when money received)
- `invoice_date` used for Receivables aging calculations (how old is the debt)
- Both datasets merged in combined import script

---

## 2025-12-10 - Combined Data Import Strategy

### Decision
Use single combined import script that merges both CSV files.

### Files
- `TPG_Collections.csv`: 506 collected opportunities with actual collection dates
- `TPG_Invoice.csv`: 1,488 opportunities with open balance tracking

### Merge Strategy
1. Parse both files independently
2. Use `opportunity_name` as merge key
3. Invoice data is base (has open balances)
4. Overlay collection dates from Collections data
5. Result: Complete picture of both collected and open receivables

### Script Location
`scripts/import-combined-data.js`

### Run Command
```bash
node scripts/import-combined-data.js
```
