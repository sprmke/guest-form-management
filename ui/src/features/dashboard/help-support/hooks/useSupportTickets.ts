import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSupportTicketScope } from './useSupportTicketScope';
import {
  fetchSupportTicket,
  fetchSupportTickets,
  replySupportTicket,
  submitSupportTicket,
  uploadSupportTicketAttachment,
  type SubmitSupportTicketPayload,
  type SupportTicketScopeParams,
} from '../lib/supportTicketApi';

import type { SupportTicketAttachmentDraft } from '../lib/supportTicketSchema';

function scopeKey(scope: SupportTicketScopeParams) {
  return [
    scope.channel ?? 'host',
    scope.orgSlug,
    scope.orgId,
    scope.propertyId,
    scope.parkingId,
  ] as const;
}

function scopeEnabled(scope: SupportTicketScopeParams): boolean {
  if (scope.channel === 'guest') return true;
  return Boolean(scope.orgSlug || scope.orgId);
}

export function useSupportTickets() {
  const scope = useSupportTicketScope();
  return useQuery({
    queryKey: ['support-tickets', ...scopeKey(scope)],
    queryFn: () => fetchSupportTickets(scope),
    enabled: scopeEnabled(scope),
  });
}

export function useSupportTicket(ticketId: string | null) {
  const scope = useSupportTicketScope();
  return useQuery({
    queryKey: ['support-ticket', ticketId, ...scopeKey(scope)],
    queryFn: () => fetchSupportTicket(scope, ticketId as string),
    enabled: Boolean(ticketId) && scopeEnabled(scope),
  });
}

export function useSubmitSupportTicket() {
  const qc = useQueryClient();
  const scope = useSupportTicketScope();

  return useMutation({
    mutationFn: (payload: Omit<SubmitSupportTicketPayload, keyof SupportTicketScopeParams>) =>
      submitSupportTicket({ ...scope, ...payload }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['support-tickets', ...scopeKey(scope)] });
    },
  });
}

export function useReplySupportTicket(ticketId: string) {
  const qc = useQueryClient();
  const scope = useSupportTicketScope();

  return useMutation({
    mutationFn: (args: { message: string; attachments?: SupportTicketAttachmentDraft[] }) =>
      replySupportTicket(scope, ticketId, args.message, args.attachments),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['support-ticket', ticketId, ...scopeKey(scope)] }),
        qc.invalidateQueries({ queryKey: ['support-tickets', ...scopeKey(scope)] }),
      ]);
    },
  });
}

export function useUploadSupportTicketAttachment() {
  const scope = useSupportTicketScope();
  return useMutation({
    mutationFn: (file: File) => uploadSupportTicketAttachment(scope, file),
  });
}
