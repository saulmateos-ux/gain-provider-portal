# Jeff Excel Import - Pre-Flight Checklist

## Critical Information
**Data Source:** `/Users/saulmateos/Documents/GitHub/Portal_Update/Data/TPG_Analysis_Jeff.xlsx`

**Expected Totals:**
- Total Opportunities: **1,524**
- Total Invoice Amount: **$5,563,375.23**
- Total Collected: **$1,286,876.73**
- Collection Rate: **23.13%**

**Impact:** This will REPLACE all data in `provider_master_data` table.

---

## Phase 1: Pre-Import Validation

### ✓ Environment Setup
- [ ] Navigate to project directory
  ```bash
  cd /Users/saulmateos/Documents/GitHub/Portal_Update/provider-portal
  ```

- [ ] Verify `.env.local` exists and has `DATABASE_URL`
  ```bash
  ls -la .env.local
  ```

- [ ] Test database connection
  ```bash
  node scripts/test-db-connection.js
  ```

### ✓ File Validation
- [ ] Verify Excel file exists
  ```bash
  ls -lh /Users/saulmateos/Documents/GitHub/Portal_Update/Data/TPG_Analysis_Jeff.xlsx
  ```
  **Expected:** ~7.3 MB file

- [ ] Check backup directory exists (will be created if not)
  ```bash
  ls -ld /Users/saulmateos/Documents/GitHub/Portal_Update/Data/backups/
  ```

### ✓ Script Validation
- [ ] Verify all scripts exist
  ```bash
  ls -lh scripts/import-jeff-excel.js
  ls -lh scripts/test-jeff-excel-import.js
  ls -lh scripts/restore-backup.js
  ```

- [ ] Check script syntax
  ```bash
  node -c scripts/import-jeff-excel.js
  node -c scripts/test-jeff-excel-import.js
  node -c scripts/restore-backup.js
  ```
  **Expected:** No output = success

---

## Phase 2: Test Run (DRY RUN - Safe)

### ✓ Run Test Script
```bash
node scripts/test-jeff-excel-import.js
```

**Expected Output:**
```
✅ ALL TESTS PASSED
   Ready to run import-jeff-excel.js
```

### ✓ Validate Test Results

Check these in the output:

- [ ] **Invoice Data sheet found**
  ```
  ✓ Sheet found: "Invoice Data"
  ✓ Rows: ~15,738
  ```

- [ ] **All required Invoice columns mapped** (should see 18 ✅ marks)
  - opname
  - opid
  - law_firm_account_name__c
  - case_status__c
  - Tranche_Name
  - tranche
  - date_of_accident__c
  - paname
  - billingstate
  - funding_stage__c
  - payoff_status__c
  - arbookname
  - ar_type__c
  - origination_date__c
  - Open Invoice
  - Settled
  - Write Off
  - Invoice_Date

- [ ] **Invoice Data parsing successful**
  ```
  ✅ Parsed ~15,738 invoice rows
  📊 Unique opportunities: 1,524
  💰 Total Invoiced: $5,563,375.23
  ```

- [ ] **Collections Data sheet found**
  ```
  ✓ Sheet found: "Collections Data"
  ✓ Rows: ~5,698
  ```

- [ ] **All required Collections columns mapped** (should see 5 ✅ marks)
  - opname
  - Total Amount Collected
  - date_deposited_1__c - Year
  - date_deposited_1__c - Month
  - date_deposited_1__c - Day

- [ ] **Collections Data parsing successful**
  ```
  ✅ Parsed ~5,698 collection rows
  📊 Unique opportunities with collections: 588
  💰 Total Collected: $1,286,876.73
  ```

- [ ] **Merge statistics look correct**
  ```
  📊 Merge Statistics:
     - Total opportunities: 1,524
     - With collections: 588
     - Without collections: 936
  ```

- [ ] **Financial totals match**
  ```
  ✅ Opportunities: 1524 == 1524
  ✅ Invoiced: $5,563,375.23 ≈ $5,563,375.23
  ✅ Collected: $1,286,876.73 ≈ $1,286,876.73
  ✅ Rate: 23.13% ≈ 23.13%
  ```

### ⚠️ If Test Fails

**DO NOT proceed with import until test passes.**

Review error messages and check:
1. Excel file version/structure hasn't changed
2. Column names match exactly
3. Data is in expected format

---

## Phase 3: Live Import (DESTRUCTIVE)

### ⚠️ Final Confirmation

**STOP**: Before proceeding, confirm:
- [ ] Test script passed ALL validations
- [ ] You understand this will REPLACE all current data
- [ ] You have access to restore backup if needed
- [ ] No one else is using the portal right now

### ✓ Run Import
```bash
node scripts/import-jeff-excel.js
```

**Monitor Output:**

- [ ] **Backup created**
  ```
  💾 Creating backup of current database state...
     ✅ Backup saved: /path/to/backup.json
     📊 Backed up XXXX records
  ```

- [ ] **Invoice Data parsed**
  ```
  1️⃣  Parsing Invoice Data sheet...
     ✅ Parsed ~15,738 invoice rows
     📊 Found 1,524 unique opportunities
     💰 Total Invoiced: $5,563,375.23
  ```

- [ ] **Collections Data parsed**
  ```
  2️⃣  Parsing Collections Data sheet...
     ✅ Parsed ~5,698 collection rows
     📊 Found 588 opportunities with collections
     💰 Total Collected: $1,286,876.73
  ```

- [ ] **Data merged**
  ```
  3️⃣  Merging Invoice and Collections data...
     ✅ Merged data for 1,524 opportunities
     - With collections: 588
     - Without collections: 936
  ```

- [ ] **Data inserted**
  ```
  4️⃣  Inserting data into database...
     ✅ Inserted 1,524 records
  ```

- [ ] **Views refreshed**
  ```
  5️⃣  Refreshing materialized views...
     ✅ provider_kpi_summary_mv
     ✅ law_firm_performance_mv
     ✅ tranche_performance_mv
  ```

- [ ] **Validation passed**
  ```
  6️⃣  Verifying import...

  ✅ ALL VALIDATIONS PASSED
  ```

### ✓ Expected Final Output
```
✅ Import completed in XX.Xs
```

---

## Phase 4: Post-Import Verification

### ✓ Database Verification

Run these SQL queries (or use database tool):

1. **Total Records**
   ```sql
   SELECT COUNT(*) FROM provider_master_data;
   ```
   **Expected:** 1524

2. **Financial Totals**
   ```sql
   SELECT
     SUM(invoice_amount) as total_invoiced,
     SUM(collected_amount) as total_collected,
     ROUND((SUM(collected_amount) / SUM(invoice_amount) * 100)::numeric, 2) as rate
   FROM provider_master_data;
   ```
   **Expected:** 5563375.23, 1286876.73, 23.13

3. **Collection Stats**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE collection_date IS NOT NULL) as with_date,
     COUNT(*) FILTER (WHERE collection_date IS NULL) as without_date
   FROM provider_master_data;
   ```
   **Expected:** 588, 936

### ✓ Portal Verification

1. **Start Portal** (if not running)
   ```bash
   npm run dev
   ```

2. **Open Dashboard**
   - Navigate to: http://localhost:3000
   - Login if needed

3. **Check KPIs** (main dashboard)
   - [ ] Total Invoiced: ~$5.56M
   - [ ] Total Collected: ~$1.29M
   - [ ] Collection Rate: ~23.1%
   - [ ] Open Balance: ~$4.28M

4. **Verify Law Firms Page**
   - [ ] Law firms display
   - [ ] Performance metrics show
   - [ ] Can drill down into cases

5. **Verify Tranches Page**
   - [ ] Tranches display
   - [ ] Financial metrics show

6. **Verify Cases Page**
   - [ ] 1,524 opportunities display
   - [ ] Can search/filter
   - [ ] Case details load

### ✓ Smoke Tests

Quick sanity checks:

- [ ] Dashboard loads without errors
- [ ] No console errors in browser
- [ ] Charts render correctly
- [ ] Numbers look reasonable
- [ ] Can navigate between pages

---

## Phase 5: Rollback (If Needed)

### If Something Went Wrong

1. **Stop the portal** (Ctrl+C if running)

2. **List available backups**
   ```bash
   node scripts/restore-backup.js
   ```

3. **Choose backup to restore** (use today's backup)
   ```bash
   node scripts/restore-backup.js ../Data/backups/provider_master_data_backup_2025-12-10.json
   ```

4. **Wait for restore to complete**
   ```
   ✅ Restore completed successfully!
   ```

5. **Verify restoration**
   ```sql
   SELECT COUNT(*) FROM provider_master_data;
   ```

6. **Restart portal**
   ```bash
   npm run dev
   ```

---

## Completion Checklist

### ✓ Import Success Criteria

All of these must be TRUE:

- [x] Import script completed without errors
- [x] All validation checks passed (✅ MATCH)
- [x] Database queries return expected totals
- [x] Portal loads and displays data correctly
- [x] No console errors
- [x] Backup file created successfully

### ✓ Documentation

- [ ] Note import date/time
- [ ] Save backup file location
- [ ] Document any issues encountered
- [ ] Update team if applicable

### ✓ Clean Up

- [ ] Close database connections
- [ ] Stop dev server if not needed
- [ ] Archive old backups if desired (keep at least 3 most recent)

---

## Quick Reference

### Important Paths
```
Excel File:    /Users/saulmateos/Documents/GitHub/Portal_Update/Data/TPG_Analysis_Jeff.xlsx
Project Dir:   /Users/saulmateos/Documents/GitHub/Portal_Update/provider-portal
Backups:       /Users/saulmateos/Documents/GitHub/Portal_Update/Data/backups/
```

### Key Commands
```bash
# Test (safe, dry run)
node scripts/test-jeff-excel-import.js

# Import (destructive)
node scripts/import-jeff-excel.js

# Restore (rollback)
node scripts/restore-backup.js [backup-file]
```

### Expected Totals
| Metric | Value |
|--------|-------|
| Opportunities | 1,524 |
| Invoice Amount | $5,563,375.23 |
| Collected Amount | $1,286,876.73 |
| Collection Rate | 23.13% |
| With Collections | 588 |
| Without Collections | 936 |

---

## Support

**Problems?** Check:
1. Error messages in console
2. Test script output
3. Database connection
4. Excel file integrity

**Need Help?** Review:
- `JEFF_EXCEL_IMPORT_README.md` - Full documentation
- Script comments - Inline documentation
- Console logs - Detailed progress info

---

**Last Updated:** 2025-12-10
**Version:** 1.0
