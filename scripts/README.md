# Provider Portal Scripts

## Data Import Scripts

### ✅ CURRENT - Use This Script

**`import-from-analysis.js`** - Primary data import script

Imports data from TPG Analysis Excel exports (converted to CSV).

**Data Sources:**
- `../Data/TPG_Analysis_Jeff_Invoice.csv` (15,738+ records)
- `../Data/TPG_Analysis_Jeff_Collections.csv` (5,698+ collection records)

**What it does:**
1. Reads Collections CSV and builds lookup map by `fid` (funding ID)
2. Parses collection dates from year/month/day columns
3. Reads Invoice CSV as master list
4. Merges collection data with invoice data by matching `fid`
5. Imports complete records with:
   - Invoice amounts (Open Invoice, Settled, Write Off)
   - Collection dates (date_deposited_1__c)
   - Collected amounts
   - All case metadata

**Usage:**
```bash
cd provider-portal
node scripts/import-from-analysis.js
```

**Expected Output:**
```
✅ Import complete!
   Imported: 15,722
   Skipped: 16

📊 Database Summary:
   Total Records: 15,722
   Total Invoiced: $5,227,987
   Total Collected: $2,144,651
   Open AR: $2,933,881
   Records with Collection Date: 5,681  👈 Critical!
   Collection Rate: 41.02%
```

**Critical Success Metric:**
- Must have 5,000+ "Records with Collection Date"
- If this is 0, Collections page will show all zeros!

---

### ❌ DEPRECATED - Do Not Use

**`import-real-data.js.OLD`** - Deprecated (old format)

Uses old TPG_Invoice.csv which lacks actual collection dates.

**Problems:**
- No collection dates → Collections page shows $0
- Incomplete data merge
- Wrong provider name handling

**Replacement:** `import-from-analysis.js`

---

## Utility Scripts

### `check-database.js`

Verifies database state after import.

**Usage:**
```bash
node scripts/check-database.js
```

**Output:**
- Total records
- Open balance by case status
- Materialized view data
- Collection date statistics

### `refresh-views-manual.js`

Manually refreshes materialized views.

**Usage:**
```bash
node scripts/refresh-views-manual.js
```

**When to use:**
- After data import (usually automatic)
- If dashboard shows stale data
- After schema changes

---

## Data Import Checklist

When importing new data, follow these steps:

### 1. Prepare Data Files

Export from `TPG_Analysis_Jeff.xlsx`:
- Sheet "Invoice Data" → Save as `TPG_Analysis_Jeff_Invoice.csv`
- Sheet "Collections Data" → Save as `TPG_Analysis_Jeff_Collections.csv`

Place both files in `/Data/` directory.

### 2. Run Import

```bash
cd provider-portal
node scripts/import-from-analysis.js
```

### 3. Verify Import

Check the output for:
- ✅ Imported count (~15,000+)
- ✅ Records with Collection Date (5,000+)
- ✅ Collection Rate (30-50%)

### 4. Verify Database

```bash
node scripts/check-database.js
```

Look for:
- Correct total records
- Non-zero materialized view data
- Collection dates present

### 5. Test Dashboard

```bash
# Test Collections API
curl -s "http://localhost:3000/api/collections/summary?period=all" | jq .

# Test Receivables API
curl -s "http://localhost:3000/api/receivables/summary" | jq .
```

Expected results:
- **Collections**: totalCollected > $1M, collectionRate > 50%
- **Receivables**: totalOpen > $2M

### 6. Refresh Browser

Hard refresh the dashboard (Cmd+Shift+R or Ctrl+Shift+R) to see updated data.

---

## Troubleshooting

### Problem: Collections page shows all zeros

**Symptom:** Total Collected = $0, Collection Rate = 0.0%

**Cause:** No collection dates in database

**Solution:**
1. Check import output: "Records with Collection Date" should be 5,000+
2. If it's 0, you used the wrong import script or wrong CSV files
3. Re-run import with `import-from-analysis.js`

### Problem: Materialized views show old data

**Symptom:** Dashboard numbers don't match database

**Solution:**
```bash
node scripts/refresh-views-manual.js
```

Or manually:
```sql
DROP MATERIALIZED VIEW IF EXISTS receivables_by_case_status_mv CASCADE;
-- Then re-run the view creation SQL
```

### Problem: "Provider not found" or wrong provider numbers

**Symptom:** Dashboard shows no data or partial data

**Cause:** Provider name mismatch (locations vs parent)

**Solution:**
1. All records should have `provider_name = 'Therapy Partners Group - Parent'`
2. Check import script consolidates all locations to parent
3. Re-import if needed

### Problem: Import skips all records

**Symptom:** "Imported: 0, Skipped: 15,738"

**Cause:** Column name mismatch (e.g., "Total Invoice" vs " Total Invoice ")

**Solution:**
1. Check CSV column names exactly match script
2. Look for leading/trailing spaces in column names
3. Update script column references if needed

---

## Data File Locations

```
Portal_Update/
├── Data/                                      # Source CSV files
│   ├── TPG_Analysis_Jeff_Invoice.csv         # ✅ USE THIS
│   ├── TPG_Analysis_Jeff_Collections.csv     # ✅ USE THIS
│   ├── TPG_Invoice.csv                       # ❌ DEPRECATED
│   ├── TPG_Collections.csv                   # ❌ DEPRECATED
│   └── Invoice_Amount_Collections.csv        # ❌ DEPRECATED
│
└── provider-portal/
    └── scripts/
        ├── import-from-analysis.js           # ✅ CURRENT
        ├── import-real-data.js.OLD           # ❌ DEPRECATED
        ├── check-database.js                 # ✅ Utility
        └── refresh-views-manual.js           # ✅ Utility
```

---

## Important Notes

1. **Always use Analysis CSV files** - They have complete data with collection dates
2. **Check collection date count** - Must be 5,000+ or Collections page won't work
3. **Provider name consolidation** - All records under "Therapy Partners Group - Parent"
4. **Materialized views** - Auto-refresh on import, manual refresh if needed
5. **Column names** - Watch for spaces in CSV column names (" Total Invoice ")

---

## Questions?

See `/CLAUDE.md` for complete project documentation, especially:
- Rule #12: DATA SOURCES - SINGLE SOURCE OF TRUTH
- Database Architecture
- API Design Patterns
