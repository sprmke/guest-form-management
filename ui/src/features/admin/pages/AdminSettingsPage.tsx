import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { GmailMailIntegrationCard } from '@/features/admin/components/GmailMailIntegrationCard';

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
      toast.success(
        'Gmail connected. The scheduled listener will use this mailbox.',
      );
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
    <AdminLayout title="Settings" breadcrumb="Configure">
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 w-full max-w-full">
        <section className="space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Integrations
          </h2>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Connect services used by automated workflows
          </p>
        </section>
        <GmailMailIntegrationCard />
      </div>
    </AdminLayout>
  );
}
