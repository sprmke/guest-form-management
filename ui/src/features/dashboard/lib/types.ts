/** Mirror of `supabase/functions/_shared/dashboardService.ts` response shape. */

export type DashboardAttentionSeverity = "critical" | "warning" | "info";

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

export type DashboardTrendWindow = {
  from: string;
  to: string;
  label: string;
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
  kpis: {
    netProfit: { value: number; changePercent: number };
    totalBookings: { value: number; changePercent: number };
    occupancyRate: { value: number; changePoints: number };
    avgNightlyRate: { value: number; changePercent: number };
    totalGuests: { value: number; changePercent: number };
    nightsBooked: { value: number; periodDays: number };
  };
};
