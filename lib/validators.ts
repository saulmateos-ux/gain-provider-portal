/**
 * Runtime Validation Schemas using Zod
 *
 * Validates API inputs, form data, and external data
 */

import { z } from 'zod';

// ==================== API Request Schemas ====================

/**
 * Date range filter
 */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Provider query parameters
 */
export const ProviderQuerySchema = z.object({
  providerId: z.string().min(1, 'Provider ID is required'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Case query parameters
 */
export const CaseQuerySchema = ProviderQuerySchema.extend({
  lawFirmId: z.string().optional(),
  caseStatus: z.string().optional(),
  locationId: z.string().optional(),
}).merge(PaginationSchema);

/**
 * Law firm query parameters
 */
export const LawFirmQuerySchema = ProviderQuerySchema.merge(PaginationSchema);

/**
 * Export request
 */
export const ExportSchema = z.object({
  providerId: z.string().min(1),
  format: z.enum(['csv', 'xlsx', 'pdf']),
  reportType: z.enum(['kpi', 'aging', 'cases', 'law-firms', 'tranches', 'full']),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ==================== Database Record Schemas ====================

/**
 * Provider master data record
 */
export const ProviderMasterDataSchema = z.object({
  id: z.number().optional(),
  salesforce_id: z.string(),
  funding_id: z.string().optional().nullable(),
  patient_name: z.string().optional().nullable(),
  patient_dob: z.date().optional().nullable(),
  opportunity_id: z.string(),
  opportunity_name: z.string(),
  date_of_accident: z.date().optional().nullable(),
  law_firm_id: z.string().optional().nullable(),
  law_firm_name: z.string().optional().nullable(),
  attorney_name: z.string().optional().nullable(),
  provider_id: z.string(),
  provider_name: z.string(),
  location_id: z.string().optional().nullable(),
  location_name: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  invoice_amount: z.number().nonnegative(),
  collected_amount: z.number().nonnegative(),
  write_off_amount: z.number().nonnegative(),
  open_balance: z.number(),
  invoice_date: z.date(),
  origination_date: z.date().optional().nullable(),
  settlement_date: z.date().optional().nullable(),
  collection_date: z.date().optional().nullable(),
  cap_date: z.date().optional().nullable(),
  funding_stage: z.string().optional().nullable(),
  funding_sub_stage: z.string().optional().nullable(),
  case_status: z.string().optional().nullable(),
  payoff_status: z.string().optional().nullable(),
  is_write_off: z.boolean().default(false),
  write_off_reason: z.string().optional().nullable(),
  tranche_id: z.string().optional().nullable(),
  tranche_name: z.string().optional().nullable(),
  ar_book_id: z.string().optional().nullable(),
  ar_book_name: z.string().optional().nullable(),
  ar_type: z.string().optional().nullable(),
});

/**
 * KPI Summary (from materialized view)
 */
export const KPISummarySchema = z.object({
  provider_id: z.string(),
  provider_name: z.string(),
  total_invoiced: z.number(),
  total_collected: z.number(),
  total_written_off: z.number(),
  total_open_balance: z.number(),
  invoice_count: z.number(),
  case_count: z.number(),
  law_firm_count: z.number(),
  collection_rate: z.number(),
  dso_days: z.number(),
  calculated_at: z.date().or(z.string()),
});

/**
 * Aging Analysis (from materialized view)
 */
export const AgingAnalysisSchema = z.object({
  provider_id: z.string(),
  current_0_30: z.number(),
  days_31_60: z.number(),
  days_61_90: z.number(),
  days_91_180: z.number(),
  days_181_365: z.number(),
  days_over_365: z.number(),
  total_open: z.number(),
  open_invoice_count: z.number(),
  calculated_at: z.date().or(z.string()),
});

/**
 * Law Firm Performance (from materialized view)
 */
export const LawFirmPerformanceSchema = z.object({
  provider_id: z.string(),
  law_firm_id: z.string(),
  law_firm_name: z.string(),
  case_count: z.number(),
  invoice_count: z.number(),
  total_invoiced: z.number(),
  total_collected: z.number(),
  total_written_off: z.number(),
  total_open: z.number(),
  collection_rate: z.number(),
  write_off_rate: z.number(),
  avg_case_duration_days: z.number().nullable(),
  avg_time_to_payment_days: z.number().nullable(),
  in_litigation_count: z.number(),
  settled_pending_count: z.number(),
  closed_paid_count: z.number(),
  calculated_at: z.date().or(z.string()),
});

// ==================== CSV Import Schemas ====================

/**
 * CSV row for data import
 */
export const CSVRowSchema = z.object({
  fid: z.string(),
  fname: z.string().optional().nullable(),
  opname: z.string(),
  opid: z.string(),
  date_of_accident__c: z.string().optional().nullable(),
  law_firm_account_name__c: z.string().optional().nullable(),
  attorneyname: z.string().optional().nullable(),
  paid: z.string(),
  paname: z.string(),
  medlocale: z.string().optional().nullable(),
  mfname: z.string().optional().nullable(),
  billingstate: z.string().optional().nullable(),
  total_invoice_amount: z.coerce.number().optional().default(0),
  total_amount_collected: z.coerce.number().optional().default(0),
  write_off: z.coerce.number().optional().default(0),
  invoice_date2: z.string(),
  origination_date__c: z.string().optional().nullable(),
  cap_date__c: z.string().optional().nullable(),
  date_deposited_1__c: z.string().optional().nullable(),
  funding_stage__c: z.string().optional().nullable(),
  case_status__c: z.string().optional().nullable(),
  payoff_status__c: z.string().optional().nullable(),
});

// ==================== Type Exports ====================

export type DateRange = z.infer<typeof DateRangeSchema>;
export type ProviderQuery = z.infer<typeof ProviderQuerySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type CaseQuery = z.infer<typeof CaseQuerySchema>;
export type LawFirmQuery = z.infer<typeof LawFirmQuerySchema>;
export type ExportRequest = z.infer<typeof ExportSchema>;
export type ProviderMasterData = z.infer<typeof ProviderMasterDataSchema>;
export type KPISummary = z.infer<typeof KPISummarySchema>;
export type AgingAnalysis = z.infer<typeof AgingAnalysisSchema>;
export type LawFirmPerformance = z.infer<typeof LawFirmPerformanceSchema>;
export type CSVRow = z.infer<typeof CSVRowSchema>;
