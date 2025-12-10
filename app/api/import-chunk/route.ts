import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import Papa from 'papaparse';

/**
 * Chunked CSV Import Endpoint (Public - No Auth Required)
 *
 * Accepts CSV data in chunks and inserts into master table
 */

interface CSVRow {
  fid: string;
  fname: string;
  opname: string;
  opid: string;
  date_of_accident__c?: string;
  law_firm_account_name__c?: string;
  attorneyname?: string;
  paid: string;
  paname: string;
  medlocale?: string;
  mfname?: string;
  billingstate?: string;
  total_invoice_amount: string;
  total_amount_collected: string;
  write_off: string;
  invoice_date2: string;
  origination_date__c?: string;
  cap_date__c?: string;
  date_deposited_1__c?: string;
  funding_stage__c?: string;
  case_status__c?: string;
  payoff_status__c?: string;
}

// Helper functions
function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function parseDecimal(value: string | undefined | null): number {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvData, clearExisting = false } = body;

    if (!csvData) {
      return NextResponse.json({ error: 'CSV data required' }, { status: 400 });
    }

    const parsed = Papa.parse<CSVRow>(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parse error', details: parsed.errors },
        { status: 400 }
      );
    }

    const result = await transaction(async (client) => {
      if (clearExisting) {
        await client.query('TRUNCATE TABLE provider_master_data CASCADE');
      }

      let inserted = 0;
      for (const row of parsed.data) {
        const invoiceAmount = parseDecimal(row.total_invoice_amount);
        const collectedAmount = parseDecimal(row.total_amount_collected);
        const writeOffAmount = parseDecimal(row.write_off);
        const openBalance = invoiceAmount - collectedAmount - writeOffAmount;

        await client.query(
          `INSERT INTO provider_master_data (
            salesforce_id, funding_id, patient_name,
            opportunity_id, opportunity_name, date_of_accident,
            law_firm_name, attorney_name,
            provider_id, provider_name, location_id, location_name, state,
            invoice_amount, collected_amount, write_off_amount, open_balance,
            invoice_date, origination_date, cap_date, collection_date,
            funding_stage, case_status, payoff_status, is_write_off
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25
          )`,
          [
            row.opid, row.fid, row.fname || null,
            row.opid, row.opname, parseDate(row.date_of_accident__c),
            row.law_firm_account_name__c || null, row.attorneyname || null,
            row.paid, row.paname, row.medlocale || null, row.mfname || null, row.billingstate || null,
            invoiceAmount, collectedAmount, writeOffAmount, openBalance,
            parseDate(row.invoice_date2), parseDate(row.origination_date__c),
            parseDate(row.cap_date__c), parseDate(row.date_deposited_1__c),
            row.funding_stage__c || null, row.case_status__c || null,
            row.payoff_status__c || null, writeOffAmount > 0,
          ]
        );
        inserted++;
      }

      return { inserted };
    });

    return NextResponse.json({
      success: true,
      recordsImported: result.inserted,
      clearedExisting: clearExisting,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        error: 'Import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
