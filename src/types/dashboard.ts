import type { payoutStats } from '@/services/dashboard-data';
import type { ProviderGuard } from '@/types/provider-guard';

/** One of the client's requests, with the pricing and invoice signals the dashboard counts. */
export type DashboardRequest = {
  id: string;
  title: string;
  status: string;
  staffing: string;
  siteName: string;
  accepted: number;
  open: number;
  expiresAt: Date | null;
  updatedAt: Date | null;
  /** The charge saved with the request, or an estimate from the client's hourly quote. */
  charge: number;
  invoiceNumber: string;
  invoiceStatus: string;
  billingCycle: string;
  invoicedAt: Date | null;
};

export type ClientDashboard = {
  drafts: number;
  submitted: number;
  inMotion: number;
  seekingCoverage: number;
  liveAssignments: number;
  inProgress: number;
  upcomingShifts: number;
  shiftsToday: number;
  coverageRisk: number;
  clientActionShifts: number;
  spend: { label: string; amount: number; hint: string };
  needsAttention: DashboardRequest[];
  atRiskShifts: DashboardShift[];
  recentJobs: DashboardJob[];
  billing: DashboardRequest[];
};

/** A job offered to, or taken by, the signed-in tenant (or, for a client, by whoever covers their request). */
export type DashboardJob = {
  id: string;
  /** The request the job belongs to. Empty when the server sent none. */
  requestId: string;
  title: string;
  siteName: string;
  status: string;
  /** Who covers the job. */
  assignee: 'service_provider' | 'guard';
  /** Hourly pay on offer to this assignee, when the request carries one. */
  hourlyPay: number | null;
  /** When the offer must be answered by. */
  dueAt: Date | null;
  updatedAt: Date | null;
};

export type DashboardShift = {
  id: string;
  title: string;
  siteName: string;
  status: string;
  /** The shift's date at the site, "2026-03-12". */
  dateLocal: string;
  start: Date | null;
  staffed: number;
  required: number;
  clientActionRequired: boolean;
  rosterDueAt: Date | null;
};

export type DashboardInvoice = {
  id: string;
  number: string;
  title: string;
  period: string;
  status: string;
  currency: string;
  amount: number;
  hours: number;
  createdAt: Date | null;
  periodStart: Date | null;
};

export type GuardDashboard = {
  /** The service provider's name when one manages this guard's coverage, availability and payout. */
  managedBy: string | null;
  actionableOffers: DashboardJob[];
  dueSoonOffers: number;
  reconfirmations: number;
  accepted: number;
  committed: number;
  inProgress: number;
  upcomingShifts: DashboardShift[];
  shiftsToday: number;
  liveShifts: number;
  atRiskShifts: number;
  recentJobs: DashboardJob[];
  payout: ReturnType<typeof payoutStats>['payout'];
  averageRate: number | null;
  invoiceCount: number;
  recentInvoices: DashboardInvoice[];
};

export type ProviderDashboard = {
  actionableOffers: DashboardJob[];
  dueSoonOffers: number;
  reconfirmations: number;
  accepted: number;
  committed: number;
  inProgress: number;
  atRiskShifts: DashboardShift[];
  clientActionShifts: number;
  activeGuards: number;
  pendingGuards: number;
  recentGuards: ProviderGuard[];
  payout: ReturnType<typeof payoutStats>['payout'];
  averageRate: number | null;
  invoiceCount: number;
  recentInvoices: DashboardInvoice[];
};
