# GAIN Provider Portal: Metric Definitions & Data Dictionary

**Version**: 1.0
**Updated**: December 10, 2025
**Author**: Saul Mateos, CFO

---

## Table of Contents

1. [Core Financial Metrics](#core-financial-metrics)
2. [Date Fields](#date-fields)
3. [Collection Metrics](#collection-metrics)
4. [Aging Analysis](#aging-analysis)
5. [Case Status Definitions](#case-status-definitions)
6. [Data Sources](#data-sources)
7. [Calculation Rules](#calculation-rules)
8. [Common Pitfalls](#common-pitfalls)

---

## Core Financial Metrics

### invoice_amount
**Definition**: The total dollar amount billed to the patient/case for services rendered.

**Source**: `TPG_Invoice.csv` (column: "Settled" or invoice total)

**Usage**: Denominator for collection rate calculations, total AR calculations.

**Example**: Patient receives physical therapy worth $320. `invoice_amount = 320.00`

---

### collected_amount
**Definition**: The actual dollar amount received as payment for an invoice.

**Source**: `TPG_Collections.csv` (column: "Total Amount Collected")

**CRITICAL**: This is NOT the same as `invoice_amount`. A $320 invoice may only collect $180.

**Usage**: Numerator for collection rate calculations, cash flow reporting.

**Example**: Of the $320 invoice, $180 was actually collected. `collected_amount = 180.00`

---

### open_balance
**Definition**: The remaining unpaid amount on an invoice.

**Formula**: `open_balance = invoice_amount - collected_amount`

**Usage**: AR reporting, aging analysis, outstanding receivables.

**Example**: $320 invoice with $180 collected = $140 open balance.

---

### write_off_amount
**Definition**: The portion of an invoice that has been written off and will not be collected.

**Formula**: `write_off_amount = invoice_amount - collected_amount` (for closed/settled invoices)

**Usage**: Loss analysis, profitability calculations.

**Note**: Only applies to invoices where collection efforts have concluded.

---

## Date Fields

### invoice_date
**Definition**: The date when the invoice was ISSUED or created.

**Source**: `TPG_Invoice.csv` (column: "Invoice_Date")

**Use For**:
* Portfolio performance metrics (what % of invoices issued in a period were collected)
* Aging calculations (how old is the invoice)
* KPI summary metrics

**SQL Pattern**:
```sql
WHERE invoice_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', invoice_date)
```

---

### collection_date
**Definition**: The date when payment was RECEIVED (deposited).

**Source**: `TPG_Collections.csv` (columns: date_deposited_1__c Year/Month/Day)

**Use For**:
* Cash flow reporting (how much money came in each month)
* Collection velocity (how fast do we collect)
* Trend charts showing actual cash received

**SQL Pattern**:
```sql
WHERE collection_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', collection_date)
```

---

### origination_date
**Definition**: The date the case/opportunity was originally created.

**Source**: `TPG_Invoice.csv` (column: "origination_date__c")

**Use For**: Case lifecycle analysis, time-to-collection calculations.

---

### settlement_date
**Definition**: The date when a legal case was settled.

**Source**: Case management system

**Use For**: Settlement pipeline analysis, payment timing predictions.

---

## Collection Metrics

### Collection Rate
**Definition**: The percentage of invoiced amounts that have been collected.

**Formula**:
```
Collection Rate = (SUM(collected_amount) / SUM(invoice_amount)) * 100
```

**CRITICAL RULES**:
1. Include ALL invoices in the calculation (collected AND uncollected)
2. NEVER filter by `collection_date IS NOT NULL` (this excludes uncollected invoices)
3. Filter by `invoice_date` for portfolio performance view

**Example**:
* Total Invoiced: $1,000,000
* Total Collected: $430,000
* Collection Rate: 43%

**Wrong Calculation (Survivorship Bias)**:
```sql
-- WRONG: Only looks at collected invoices
SELECT SUM(collected_amount) / SUM(invoice_amount) * 100
FROM provider_master_data
WHERE collection_date IS NOT NULL  -- THIS EXCLUDES UNCOLLECTED!
-- Result: ~97% (WRONG - only collected invoices are counted)
```

**Correct Calculation**:
```sql
-- CORRECT: Includes ALL invoices
SELECT SUM(collected_amount) / SUM(invoice_amount) * 100
FROM provider_master_data
WHERE invoice_date >= CURRENT_DATE - INTERVAL '12 months'
-- Result: ~43% (CORRECT - includes open invoices)
```

---

### Days Sales Outstanding (DSO)
**Definition**: Average number of days to collect payment after invoicing.

**Formula**:
```
DSO = (open_balance / total_invoiced) * number_of_days_in_period
```

**Alternative Formula**:
```
DSO = AVG(collection_date - invoice_date) for collected invoices
```

**Usage**: Measures collection efficiency. Lower is better.

---

### Collection Velocity
**Definition**: The speed at which invoices are collected, measured in days.

**Formula**: `collection_date - invoice_date` (for each collected invoice)

**Metrics**:
* Average days to collect
* Median days to collect
* Min/Max range

---

## Aging Analysis

### Aging Buckets
Standard aging categories based on days since invoice_date:

| Bucket | Days Range | Risk Level |
|--------|------------|------------|
| Current | 0-30 days | Low |
| 31-60 | 31-60 days | Low-Medium |
| 61-90 | 61-90 days | Medium |
| 91-180 | 91-180 days | High |
| 180+ | Over 180 days | Critical |

**Formula**:
```sql
CASE
  WHEN CURRENT_DATE - invoice_date <= 30 THEN '0-30'
  WHEN CURRENT_DATE - invoice_date <= 60 THEN '31-60'
  WHEN CURRENT_DATE - invoice_date <= 90 THEN '61-90'
  WHEN CURRENT_DATE - invoice_date <= 180 THEN '91-180'
  ELSE '180+'
END as aging_bucket
```

---

## Case Status Definitions

| Status | Definition | Collection Expected |
|--------|------------|---------------------|
| **Active** | Case is ongoing, not yet resolved | No (still in litigation) |
| **Settled** | Case resolved, awaiting payment | Yes (payment expected) |
| **Paid** | Payment received in full | Completed |
| **Partially Paid** | Some payment received | Remaining balance open |
| **Write-Off** | Deemed uncollectible | No |
| **Dismissed** | Case dismissed | Unlikely |

---

## Data Sources

### TPG_Collections.csv
**Purpose**: Contains actual payment/collection data.

**Key Columns**:
| Column | Maps To | Description |
|--------|---------|-------------|
| opname | opportunity_name | Case/opportunity identifier |
| Total Invoice Amount | invoice_amount | Original invoice total |
| Total Amount Collected | collected_amount | Actual payment received |
| date_deposited_1__c | collection_date | When payment was deposited |
| law_firm_account_name__c | law_firm_name | Associated law firm |
| case_status__c | case_status | Current case status |

**Use For**: Actual collection amounts, collection dates, payment data.

---

### TPG_Invoice.csv
**Purpose**: Contains invoice and case metadata.

**Key Columns**:
| Column | Maps To | Description |
|--------|---------|-------------|
| Opportunity Name | opportunity_name | Case/opportunity identifier |
| Settled | invoice_amount | Invoice total |
| Open Balance | open_balance | Remaining unpaid |
| Invoice_Date | invoice_date | Date invoice issued |
| Law Firm Name | law_firm_name | Associated law firm |
| Stage | case_status | Current status |

**Use For**: Invoice metadata, case information, open balances for uncollected invoices.

---

## Calculation Rules

### Rule 1: Collection Rate Must Include All Invoices
```sql
-- CORRECT
SELECT SUM(collected_amount) / SUM(invoice_amount) * 100 as collection_rate
FROM provider_master_data
WHERE invoice_date >= '2024-01-01'
-- Includes both collected AND uncollected invoices

-- WRONG (survivorship bias)
SELECT SUM(collected_amount) / SUM(invoice_amount) * 100 as collection_rate
FROM provider_master_data
WHERE collection_date IS NOT NULL  -- Excludes uncollected!
```

### Rule 2: Cash Flow Uses collection_date
```sql
-- Cash flow by month (when money came in)
SELECT
  DATE_TRUNC('month', collection_date) as month,
  SUM(collected_amount) as cash_received
FROM provider_master_data
WHERE collection_date IS NOT NULL
GROUP BY DATE_TRUNC('month', collection_date)
```

### Rule 3: Portfolio Performance Uses invoice_date
```sql
-- Collection rate for invoices issued in period
SELECT
  DATE_TRUNC('month', invoice_date) as month,
  SUM(collected_amount) / SUM(invoice_amount) * 100 as collection_rate
FROM provider_master_data
WHERE invoice_date >= '2024-01-01'
GROUP BY DATE_TRUNC('month', invoice_date)
```

### Rule 4: Cumulative Collection Rate
For trend charts showing collection rate over time:
```sql
-- Running cumulative collection rate
SELECT
  month,
  SUM(collected_amount) OVER (ORDER BY month) as cumulative_collected,
  SUM(invoice_amount) OVER (ORDER BY month) as cumulative_invoiced,
  (cumulative_collected / cumulative_invoiced * 100) as collection_rate
FROM monthly_data
```

---

## Common Pitfalls

### Pitfall 1: Survivorship Bias
**Problem**: Filtering `WHERE collection_date IS NOT NULL` excludes uncollected invoices.

**Result**: Collection rate appears artificially high (~97% instead of ~43%).

**Solution**: Never filter by collection_date when calculating collection rate.

---

### Pitfall 2: Wrong Date Field
**Problem**: Using `collection_date` for portfolio metrics or `invoice_date` for cash flow.

**Result**: Misleading trends and incorrect period assignments.

**Solution**:
* Portfolio metrics = filter/group by `invoice_date`
* Cash flow metrics = filter/group by `collection_date`

---

### Pitfall 3: Data Import Merge Errors
**Problem**: When merging data sources, only copying dates but not financial amounts.

**Result**: `collected_amount = invoice_amount` for all records (100% collection).

**Solution**: Always copy ALL financial fields during merge:
```javascript
// CORRECT merge
existingOpp.collection_date = colOpp.collection_date;
existingOpp.collected_amount = colOpp.collected_amount;
existingOpp.write_off_amount = colOpp.write_off_amount;
existingOpp.open_balance = invoice_amount - collected_amount;
```

---

### Pitfall 4: Mixing Metrics
**Problem**: Showing "cash received this month" alongside "collection rate for invoices issued this month."

**Result**: Confusing or misleading dashboard.

**Solution**: Clearly label what each metric represents:
* "Cash Collected (by deposit date)" vs "Collection Rate (by invoice date)"

---

## Quick Reference Card

| Metric | Formula | Filter By | Group By |
|--------|---------|-----------|----------|
| Collection Rate | collected / invoiced | invoice_date | N/A or invoice_date |
| Cash Flow | SUM(collected) | collection_date | collection_date |
| Aging | DATEDIFF(today, invoice_date) | open_balance > 0 | aging_bucket |
| DSO | (open / invoiced) * days | invoice_date | N/A |
| Velocity | collection_date - invoice_date | collection_date NOT NULL | month |

---

**Document Maintained By**: Engineering Team
**Last Verified**: December 10, 2025
