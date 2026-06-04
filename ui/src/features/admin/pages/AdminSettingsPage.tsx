import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AppSettingsCard } from '@/features/admin/components/AppSettingsCard';

/**
 * Admin settings — integrations and workspace configuration.
 * Gmail listener OAuth lives here (moved from the bookings list page).
 */
export function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();

  useEffect(() => {
    const gmailOk = searchParams.get('gmail_connected');
    const gmailErr = searchParams.get('gmail_error');
    if (!gmailOk && !gmailErr) return;

    const next = new URLSearchParams(searchParams);
    if (gmailOk) {
      toast.success('Gmail connected');
      next.delete('gmail_connected');
      void qc.invalidateQueries({ queryKey: ['gmail-mail-integration'] });
    }
    if (gmailErr) {
      toast.error(`Gmail connection failed: ${gmailErr}`);
      next.delete('gmail_error');
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, qc]);

  return (
    <AdminLayout>
      <AppSettingsCard />
    </AdminLayout>
  );
}
