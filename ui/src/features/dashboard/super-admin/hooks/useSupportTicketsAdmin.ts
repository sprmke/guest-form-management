import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  SupportTicket,
  SupportTicketMessage,
} from '@/features/dashboard/help-support/lib/supportTicketApi';
import { callEdgeFunction } from '@/features/dashboard/org/lib/edgeClient';

export type AdminSupportTicket = SupportTicket & {
  organizationName: string;
  organizationSlug: string;
};

export type SupportTicketAdminFilters = {
  category: string | null;
  status: string | null;
  orgId: string | null;
};

export const SUPPORT_TICKETS_ADMIN_QUERY_KEY = ['super-admin', 'support-tickets'] as const;

function filtersToQuery(filters: SupportTicketAdminFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.status) params.set('status', filters.status);
  if (filters.orgId) params.set('org_id', filters.orgId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useSupportTicketsAdmin(filters: SupportTicketAdminFilters) {
  return useQuery({
    queryKey: [...SUPPORT_TICKETS_ADMIN_QUERY_KEY, filters],
    queryFn: () =>
      callEdgeFunction<{ tickets: AdminSupportTicket[] }>(
        `list-support-tickets-admin${filtersToQuery(filters)}`
      ),
  });
}

export function useSupportTicketAdmin(ticketId: string | null) {
  return useQuery({
    queryKey: ['super-admin', 'support-ticket', ticketId],
    queryFn: () =>
      callEdgeFunction<{ ticket: AdminSupportTicket; messages: SupportTicketMessage[] }>(
        `get-support-ticket-admin?ticket_id=${encodeURIComponent(ticketId as string)}`
      ),
    enabled: Boolean(ticketId),
  });
}

export function useReplySupportTicketAdmin(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      callEdgeFunction<{ message: SupportTicketMessage }>('reply-support-ticket-admin', {
        method: 'POST',
        body: JSON.stringify({ ticketId, message }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['super-admin', 'support-ticket', ticketId] });
      await qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_ADMIN_QUERY_KEY });
    },
  });
}

export function useUpdateSupportTicketStatus(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: { status?: string; priority?: string | null }) =>
      callEdgeFunction<{ ticket: AdminSupportTicket }>('update-support-ticket-status', {
        method: 'POST',
        body: JSON.stringify({ ticketId, ...updates }),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['super-admin', 'support-ticket', ticketId] });
      await qc.invalidateQueries({ queryKey: SUPPORT_TICKETS_ADMIN_QUERY_KEY });
    },
  });
}
