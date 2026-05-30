import type { BookingFinancials } from '@/features/admin/lib/bookingFinance';

export type FinancePeriodBasis = 'check_in' | 'check_out' | 'completed';

export type FinanceTab = 'overview' | 'stays' | 'operating';

export type FinanceQuery = {
  tab: FinanceTab;
  basis: FinancePeriodBasis;
  from: string | null;
  to: string | null;
  includeCancelled: boolean;
  completedOnly: boolean;
  q: string;
  page: number;
  limit: number;
  sort: 'check_in_date:asc' | 'check_in_date:desc' | 'host_net:desc' | 'host_net:asc';
};

export const DEFAULT_FINANCE_QUERY: FinanceQuery = {
  tab: 'overview',
  basis: 'completed',
  from: null,
  to: null,
  includeCancelled: false,
  completedOnly: false,
  q: '',
  page: 1,
  limit: 25,
  sort: 'check_in_date:desc',
};

export type FinanceStaysSummary = {
  count: number;
  completedCount: number;
  guestCollected: number;
  stayRevenue: number;
  parkingMargin: number;
  sdExpenses: number;
  hostNetCompleted: number;
  projectedNetPipeline: number;
  outstandingGuestBalance: number;
};

export type FinanceOperatingSummary = {
  income: number;
  expenses: number;
  net: number;
};

export type FinanceSummary = {
  period: {
    basis: FinancePeriodBasis;
    from: string | null;
    to: string | null;
  };
  stays: FinanceStaysSummary;
  operating: FinanceOperatingSummary;
  grandNet: number;
};

export type FinanceBookingLedgerRow = {
  id: string;
  guest_facebook_name: string;
  primary_guest_name: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  financials: BookingFinancials;
};

export type FinanceLineItem = {
  id: string;
  kind: 'expense' | 'income';
  label: string;
  amount: number;
  category: string | null;
  occurred_on: string;
  notes: string | null;
  receipt_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceExportType = 'overview' | 'stays' | 'operating' | 'combined';
