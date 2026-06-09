/** Mirror of `supabase/functions/_shared/dashboardService.ts` response shape. */

export type DashboardAttentionSeverity = 'critical' | 'warning' | 'info';

export type DashboardAttentionItem = {
  id: string;
  label: string;
  count: number;
  href: string;
  severity: DashboardAttentionSeverity;
};

export type DashboardPipelineSlice = {
  status: string;
  count: number;
};

export type DashboardTrendPoint = {
  month: string;
  label: string;
  net: number;
  stays: number;
};

export type DashboardCheckInPoint = {
  month: string;
  label: string;
  checkIns: number;
  nights: number;
};

export type DashboardTrendWindow = {
  from: string;
  to: string;
  label: string;
  granularity: 'day' | 'week' | 'month';
};

export type DashboardUpcomingStay = {
  id: string;
  guestName: string;
  checkInIso: string;
  checkOutIso: string;
  status: string;
  nights: number;
  pax: number;
  needParking: boolean;
  hasPets: boolean;
  guestRequestsSurpriseDecor: boolean;
};

export type DashboardStats = {
  manilaDate: string;
  attention: DashboardAttentionItem[];
  pipeline: DashboardPipelineSlice[];
  revenueTrend: DashboardTrendPoint[];
  checkInTrend: DashboardCheckInPoint[];
  trendWindow: DashboardTrendWindow;
  upcoming: DashboardUpcomingStay[];
  finance: {
    monthNet: number;
    monthStays: number;
    outstandingBalance: number;
    pipelineEstimate: number;
  };
  totals: {
    activeBookings: number;
    totalBookings: number;
    periodDays: number;
    checkInsToday: number;
    checkOutsToday: number;
  };
};
