# Jeff Excel Import Scripts

## Overview

This suite of scripts imports critical financial data from `TPG_Analysis_Jeff.xlsx` into the `provider_master_data` table.

**CRITICAL DATA**: This import handles 1,524 opportunities totaling $5.56M in invoices and $1.29M in collections.

## Files Created

### 1. `import-jeff-excel.js` (MAIN IMPORT)
The primary import script that reads the Excel file and populates the database.

**Features:**
- Automatic backup before import
- Parses both Invoice Data and Collections Data sheets
- Merges data on opportunity name
- Validates totals against expected values
- Refreshes materialized views
- Comprehensive error handling

**Usage:**
```bash
cd /Users/saulmateos/Documents/GitHub/Portal_Update/provider-portal
node scripts/import-jeff-excel.js
```

### 2. `test-jeff-excel-import.js` (DRY RUN)
Test script that validates the Excel file WITHOUT touching the database.

**Features:**
- Validates file structure
- Checks all column mappings
- Parses and totals data
- Compares against expected values
- NO database operations

**Usage:**
```bash
node scripts/test-jeff-excel-import.js
```

**Run this FIRST** to verify everything before running the actual import.

### 3. `restore-backup.js` (ROLLBACK)
Restores database from a backup file.

**Usage:**
```bash
node scripts/restore-backup.js ../Data/backups/provider_master_data_backup_2025-12-10.json
```

List available backups:
```bash
node scripts/restore-backup.js
```

## Data Structure

### Excel File: `TPG_Analysis_Jeff.xlsx`

**Location:** `/Users/saulmateos/Documents/GitHub/Portal_Update/Data/TPG_Analysis_Jeff.xlsx`

#### Sheet 1: Invoice Data
- **Rows:** 15,738 invoice rows
- **Opportunities:** 1,524 unique
- **Purpose:** Contains all invoice amounts and metadata

**Key Columns:**
- `opname` - Opportunity name (merge key)
- `opid` - Opportunity ID
- `law_firm_account_name__c` - Law firm name
- `case_status__c` - Case status
- `Tranche_Name` - Tranche name
- `tranche` - Tranche ID
- `date_of_accident__c` - Accident date
- `paname` - Provider name
- `billingstate` - State
- `funding_stage__c` - Funding stage
- `payoff_status__c` - Payoff status
- `arbookname` - AR book name
- `ar_type__c` - AR type
- `Open Invoice` - Open invoice amount
- `Settled` - Settled amount
- `Write Off` - Write-off amount
- `Invoice_Date` - Invoice date
- `origination_date__c` - Origination date

#### Sheet 2: Collections Data
- **Rows:** 5,698 collection rows (header at row 2)
- **Opportunities:** 588 with collections
- **Purpose:** Contains ACTUAL collected amounts

**Key Columns:**
- `opname` - Opportunity name (merge key)
- `Total Amount Collected` - Collected amount
- `date_deposited_1__c - Year` - Collection year
- `date_deposited_1__c - Month` - Collection month
- `date_deposited_1__c - Day` - Collection day

## Import Logic

### Step 1: Parse Invoice Data
1. Read all invoice rows
2. Sum by opportunity name:
   - `invoice_amount` = Open Invoice + Settled + Write Off
   - `open_balance` = Open Invoice (initial)
   - Track earliest `invoice_date`

### Step 2: Parse Collections Data
1. Read all collection rows
2. Sum by opportunity name:
   - `collected_amount` = Total Amount Collected
   - Track earliest `collection_date`

### Step 3: Merge Data
For each opportunity:
- **If has collections:**
  - Use `collected_amount` from Collections Data
  - Set `collection_date` from Collections Data
  - Recalculate: `write_off_amount` = `invoice_amount` - `collected_amount`
  - Recalculate: `open_balance` = `invoice_amount` - `collected_amount`

- **If no collections:**
  - Set `collected_amount` = 0
  - Set `collection_date` = NULL
  - Keep `open_balance` = `invoice_amount`

### Step 4: Insert into Database
- Truncate existing `provider_master_data`
- Insert all merged opportunities
- Generate `salesforce_id` if missing
- Set `provider_id` = 'TPG-001'

### Step 5: Refresh Views
- Recreate all materialized views
- Ensure dashboard has fresh data

### Step 6: Validate
Compare actual vs expected:
- Total records: **1,524**
- Total invoice amount: **$5,563,375.23**
- Total collected: **$1,286,876.73**
- Collection rate: **23.13%**

## Expected Totals (MUST MATCH)

| Metric | Expected Value |
|--------|----------------|
| Total Opportunities | 1,524 |
| Total Invoice Amount | $5,563,375.23 |
| Total Collected | $1,286,876.73 |
| Collection Rate | 23.13% |
| With Collections | 588 |
| Without Collections | 936 |

**Allowed Variance:**
- Dollar amounts: ±$1.00 (rounding)
- Collection rate: ±0.5%

## Backup System

### Automatic Backup
The import script automatically creates a backup before any changes:

**Location:** `/Users/saulmateos/Documents/GitHub/Portal_Update/Data/backups/`

**Filename:** `provider_master_data_backup_YYYY-MM-DD.json`

**Contents:**
```json
{
  "exportDate": "2025-12-10T12:00:00.000Z",
  "recordCount": 1524,
  "data": [...]
}
```

### Manual Backup
To create a manual backup:
```bash
node scripts/restore-backup.js
# This will list existing backups
```

### Restore from Backup
```bash
node scripts/restore-backup.js ../Data/backups/provider_master_data_backup_2025-12-10.json
```

## Pre-Import Checklist

- [ ] Run test script first: `node scripts/test-jeff-excel-import.js`
- [ ] Verify all column mappings show ✅
- [ ] Verify totals match expected values
- [ ] Ensure database connection works (check `.env.local`)
- [ ] Confirm backup directory exists: `/Users/saulmateos/Documents/GitHub/Portal_Update/Data/backups/`
- [ ] Review current data if needed

## Running the Import

### Step 1: Test (DRY RUN)
```bash
cd /Users/saulmateos/Documents/GitHub/Portal_Update/provider-portal
node scripts/test-jeff-excel-import.js
```

**Expected output:**
```
✅ ALL TESTS PASSED
   Ready to run import-jeff-excel.js
```

If you see `⚠️ SOME TESTS FAILED`, review the differences before proceeding.

### Step 2: Import (LIVE)
```bash
node scripts/import-jeff-excel.js
```

**Expected output:**
```
✅ Import completed in XX.Xs

📊 VERIFICATION RESULTS:
✓ Total Records: 1524
  Status: ✅ MATCH
✓ Total Invoice Amount: $5,563,375.23
  Status: ✅ MATCH
✓ Total Collected Amount: $1,286,876.73
  Status: ✅ MATCH
✓ Collection Rate: 23.13%
  Status: ✅ MATCH

✅ ALL VALIDATIONS PASSED
```

### Step 3: Verify in Dashboard
1. Open portal: http://localhost:3000
2. Check KPIs match expected values
3. Verify law firm data displays correctly
4. Check tranche performance

## Troubleshooting

### Error: "Excel file not found"
**Solution:** Verify file path:
```bash
ls -lh /Users/saulmateos/Documents/GitHub/Portal_Update/Data/TPG_Analysis_Jeff.xlsx
```

### Error: "Sheet not found"
**Solution:** Check sheet names in Excel file. Expected:
- "Invoice Data"
- "Collections Data"

### Error: "Column not found"
**Solution:** Run test script to see which columns are missing:
```bash
node scripts/test-jeff-excel-import.js
```

### Validation Mismatches
If totals don't match expected values:

1. **Check Excel file version:** Ensure you have the correct version
2. **Review parsing logic:** Check if any rows are being skipped
3. **Inspect sample data:** Look at the sample rows printed by test script
4. **Check for formula errors:** Some cells might have Excel formula errors

### Database Connection Issues
**Solution:** Verify `.env.local` has correct `DATABASE_URL`:
```bash
node scripts/test-db-connection.js
```

## Rollback Procedure

If import fails or data is incorrect:

### Option 1: Restore from Backup
```bash
# List backups
node scripts/restore-backup.js

# Restore specific backup
node scripts/restore-backup.js ../Data/backups/provider_master_data_backup_2025-12-10.json
```

### Option 2: Re-import from Previous Source
If you have the previous data source (CSV files, etc.):
```bash
node scripts/import-combined-data.js
```

## Data Validation Queries

After import, run these SQL queries to validate:

### Total Records
```sql
SELECT COUNT(*) as total FROM provider_master_data;
-- Expected: 1524
```

### Financial Totals
```sql
SELECT
  SUM(invoice_amount) as total_invoiced,
  SUM(collected_amount) as total_collected,
  SUM(open_balance) as total_open,
  ROUND((SUM(collected_amount) / SUM(invoice_amount) * 100)::numeric, 2) as collection_rate
FROM provider_master_data;
-- Expected: 5563375.23, 1286876.73, 4276498.50, 23.13
```

### Collection Date Stats
```sql
SELECT
  COUNT(*) FILTER (WHERE collection_date IS NOT NULL) as with_collection_date,
  COUNT(*) FILTER (WHERE collection_date IS NULL) as without_collection_date
FROM provider_master_data;
-- Expected: 588, 936
```

### Top Law Firms
```sql
SELECT
  law_firm_name,
  COUNT(*) as opportunity_count,
  SUM(invoice_amount) as total_invoiced,
  SUM(collected_amount) as total_collected
FROM provider_master_data
GROUP BY law_firm_name
ORDER BY total_invoiced DESC
LIMIT 10;
```

## Column Mappings Reference

### Invoice Data → Database

| Excel Column | Database Column | Notes |
|--------------|-----------------|-------|
| opname | opportunity_name | Merge key |
| opid | opportunity_id | |
| law_firm_account_name__c | law_firm_name | |
| case_status__c | case_status | |
| Tranche_Name | tranche_name | |
| tranche | tranche_id | |
| date_of_accident__c | date_of_accident | |
| paname | provider_name | Default: "Therapy Partners Group - Parent" |
| billingstate | state | |
| funding_stage__c | funding_stage | |
| payoff_status__c | payoff_status | |
| arbookname | ar_book_name | |
| ar_type__c | ar_type | |
| Open Invoice + Settled + Write Off | invoice_amount | Sum |
| Invoice_Date | invoice_date | Earliest per opportunity |
| origination_date__c | origination_date | |

### Collections Data → Database

| Excel Column | Database Column | Notes |
|--------------|-----------------|-------|
| opname | opportunity_name | Merge key |
| Total Amount Collected | collected_amount | Sum per opportunity |
| date_deposited_1__c (Year/Month/Day) | collection_date | Earliest per opportunity |

### Calculated Fields

| Field | Calculation |
|-------|-------------|
| write_off_amount | invoice_amount - collected_amount |
| open_balance | invoice_amount - collected_amount (for collected opps) OR invoice_amount (for non-collected) |
| salesforce_id | opid OR generated from opportunity name |
| provider_id | 'TPG-001' (hardcoded) |

## Dependencies

### Required Packages
All already installed in `package.json`:
- `exceljs` - Excel file parsing
- `pg` - PostgreSQL client
- `dotenv` - Environment variables

### Required Environment
- `.env.local` with `DATABASE_URL`
- Access to Neon PostgreSQL database
- Node.js 18+

## Security Notes

- Backup files contain sensitive financial data
- Keep backups secure and private
- Don't commit backup files to git
- Backups are stored in `/Data/backups/` (already in `.gitignore`)

## Performance

**Expected runtime:**
- Test script: ~3-5 seconds
- Import script: ~10-15 seconds
- Restore script: ~8-12 seconds

**Database impact:**
- TRUNCATE operation locks table briefly
- Materialized view refresh may take 10-20 seconds
- Total downtime: ~30-45 seconds

## Support

If you encounter issues:

1. **Run test script first** to diagnose
2. **Check logs** for specific error messages
3. **Verify Excel file** hasn't changed structure
4. **Review backup** if rollback needed
5. **Check database connection** if queries fail

## Change Log

### 2025-12-10
- Created initial import suite
- Added test script for validation
- Added backup/restore functionality
- Documented expected totals and validation rules
