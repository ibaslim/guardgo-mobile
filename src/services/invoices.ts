import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError } from '@/services/api';
import { lower, toNumber } from '@/services/dashboard-data';
import type { Raw } from '@/types/api';
import type { AdjustmentStatus, Invoice, InvoiceAdjustment, InvoiceLineItem, InvoicesPage } from '@/types/invoice';
import { fromIsoDate, parseServerTimestamp, parseWallClock } from '@/utils/dates';

export const INVOICES_PAGE_SIZE = 20;

const optionalNumber = (value: unknown) => (value === null || value === undefined || value === '' ? null : toNumber(value));

function parseLine(raw: Raw): InvoiceLineItem {
  return {
    description: raw.description || 'Coverage payout',
    date: fromIsoDate(raw.service_date_local),
    start: parseWallClock(raw.metadata?.start_at_local),
    end: parseWallClock(raw.metadata?.end_at_local),
    hours: toNumber(raw.quantity),
    rate: toNumber(raw.unit_rate),
    amount: toNumber(raw.amount),
    positions: optionalNumber(raw.metadata?.committed_slots),
    hoursPerPosition: optionalNumber(raw.metadata?.hours_per_position),
  };
}

const ADJUSTMENT_STATUSES: readonly string[] = ['approved', 'draft', 'voided'];

function parseAdjustment(raw: Raw): InvoiceAdjustment {
  return {
    id: String(raw.id ?? ''),
    status: ADJUSTMENT_STATUSES.includes(lower(raw.adjustment_status) as AdjustmentStatus) ? (lower(raw.adjustment_status) as AdjustmentStatus) : 'approved',
    reason: raw.reason || 'Platform payout adjustment',
    amount: toNumber(raw.amount),
    by: raw.created_by_username || 'Platform admin',
    createdAt: parseServerTimestamp(raw.created_at),
  };
}

export function parseInvoice(raw: Raw): Invoice {
  const amount = toNumber(raw.estimated_amount);
  return {
    id: String(raw.id ?? ''),
    number: String(raw.invoice_number ?? ''),
    title: raw.request_title || 'Coverage invoice',
    siteName: raw.site_name || 'Site unavailable',
    status: lower(raw.invoice_status),
    contractType: lower(raw.contract_type),
    coverageStatus: lower(raw.coverage_status),
    billingCycle: lower(raw.billing_cycle),
    period: raw.billing_period_label || '',
    periodStart: fromIsoDate(raw.billing_period_start_local) ?? parseServerTimestamp(raw.created_at),
    currency: raw.currency || 'CAD',
    hourlyRate: toNumber(raw.payout_hourly_rate),
    hours: toNumber(raw.estimated_total_hours),
    baseline: raw.baseline_estimated_amount == null ? amount : toNumber(raw.baseline_estimated_amount),
    amount,
    adjustmentTotal: toNumber(raw.payout_adjustment_total),
    adjustmentCount: toNumber(raw.payout_adjustment_count),
    positions: optionalNumber(raw.committed_slots),
    note: String(raw.note ?? ''),
    adjustments: (raw.payout_adjustments ?? []).map(parseAdjustment),
    lines: (raw.line_items ?? []).map(parseLine),
    createdAt: parseServerTimestamp(raw.created_at),
    updatedAt: parseServerTimestamp(raw.updated_at),
  };
}

type RawPage = {
  items?: Raw[];
  pagination?: { page?: number; total_pages?: number; total_items?: number };
};

/** One page of the user's payout invoices, newest first. */
export async function listInvoicesPage(page: number): Promise<InvoicesPage> {
  const response = await api.get<RawPage>(ENDPOINTS.dashboard.invoices, { query: { page, rows: INVOICES_PAGE_SIZE } });
  return {
    items: (response.items ?? []).filter((item) => item.id).map(parseInvoice),
    page: response.pagination?.page ?? page,
    totalPages: response.pagination?.total_pages ?? 1,
    totalItems: response.pagination?.total_items ?? 0,
  };
}

/** One invoice with its line items and adjustments. */
export async function getInvoice(id: string): Promise<Invoice> {
  return parseInvoice(await api.get<Raw>(`${ENDPOINTS.dashboard.invoices}/${id}`));
}

/** A readable reason for a failed invoices call. */
export function invoicesErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408) return "Couldn't reach GuardGo. Check your connection and try again.";
    if (error.message && !error.message.startsWith('Request failed')) return error.message;
  }
  return fallback;
}
