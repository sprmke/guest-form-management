/** Active workflow stages on the dashboard pipeline chart — keep in sync with `dashboardService.ts#PIPELINE_STATUSES`. */
export const DASHBOARD_PIPELINE_STATUSES = [
  'PENDING_REVIEW',
  'PENDING_DOCUMENTS',
  'PENDING_GAF',
  'PENDING_PARKING_REQUEST',
  'PENDING_PET_REQUEST',
  'READY_FOR_CHECKIN',
  'READY_FOR_CHECKOUT',
  'PENDING_SD_REFUND',
] as const;

export type DashboardPipelineStatus = (typeof DASHBOARD_PIPELINE_STATUSES)[number];
