export type InvoiceLineItem = {
  description: string;
  /** The day worked, at the site. */
  date: Date | null;
  start: Date | null;
  end: Date | null;
  hours: number;
  rate: number;
  amount: number;
  positions: number | null;
  hoursPerPosition: number | null;
};

/** Only an approved adjustment counts toward the invoice; a draft is waiting and a voided one was cancelled. */
export type AdjustmentStatus = 'approved' | 'draft' | 'voided';

export type InvoiceAdjustment = {
  id: string;
  status: AdjustmentStatus;
  reason: string;
  amount: number;
  by: string;
  createdAt: Date | null;
};

/** One payout invoice: the signed-in guard's or provider's own share of a request's coverage. */
export type Invoice = {
  id: string;
  number: string;
  title: string;
  siteName: string;
  status: string;
  contractType: string;
  coverageStatus: string;
  billingCycle: string;
  period: string;
  periodStart: Date | null;
  currency: string;
  hourlyRate: number;
  hours: number;
  /** What the schedule alone pays, before platform adjustments. */
  baseline: number;
  /** What is expected to be paid, adjustments included. */
  amount: number;
  adjustmentTotal: number;
  adjustmentCount: number;
  positions: number | null;
  note: string;
  adjustments: InvoiceAdjustment[];
  lines: InvoiceLineItem[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type InvoicesPage = {
  items: Invoice[];
  page: number;
  totalPages: number;
  totalItems: number;
};

export type InvoiceMonth = { key: string; label: string; total: number; currency: string; invoices: Invoice[] };
