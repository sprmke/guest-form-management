import { useEffect, useRef } from 'react';

import { useSearchParams } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { AppSettingsCard } from '@/features/dashboard/bookings/components/AppSettingsCard';

import { gmailOAuthCallbackError } from '@/lib/feedback/toastMessages';

/**
 * Admin settings — integrations and workspace configuration.
 * Gmail listener OAuth lives here (moved from the bookings list page).
 */
export function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const handledGmailRedirect = useRef(false);

  useEffect(() => {
    const gmailOk = searchParams.get('gmail_connected');
    const gmailErr = searchParams.get('gmail_error');
    if (!gmailOk && !gmailErr) return;
    if (handledGmailRedirect.current) return;
    handledGmailRedirect.current = true;

    const next = new URLSearchParams(searchParams);
    if (gmailOk) {
      toast.success('Google connected');
      next.delete('gmail_connected');
      void qc.invalidateQueries({ queryKey: ['gmail-mail-integration'] });
      void qc.invalidateQueries({ queryKey: ['app-settings'] });
    }
    if (gmailErr) {
      toast.error(gmailOAuthCallbackError(gmailErr));
      next.delete('gmail_error');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, qc]);

  return <AppSettingsCard />;
}
