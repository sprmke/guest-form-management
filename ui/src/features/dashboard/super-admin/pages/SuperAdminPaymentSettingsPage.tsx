import { useEffect, useState } from 'react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import {
  usePlatformPaymentSettings,
  useUpdatePlatformPaymentSettings,
} from '@/features/dashboard/super-admin/hooks/usePlatformPaymentSettings';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePageTitle } from '@/lib/pageTitle';

const RAIL_OPTIONS = ['qrph', 'paymaya', 'dob'] as const;

export function SuperAdminPaymentSettingsPage() {
  usePageTitle('Kame Homes - Payment settings');
  const { data, isLoading, error } = usePlatformPaymentSettings();
  const save = useUpdatePlatformPaymentSettings();
  const [methods, setMethods] = useState<string[]>([]);
  const [leadDays, setLeadDays] = useState('5');
  const [graceDays, setGraceDays] = useState('5');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!data || initialized) return;
    setMethods(data.enabledPaymentMethods ?? []);
    setLeadDays(String(data.renewalLinkLeadDays ?? 5));
    setGraceDays(String(data.gracePeriodDays ?? 5));
    setInitialized(true);
  }, [data, initialized]);

  if (isLoading && !data) return <SuperAdminPageLoading metricCount={2} />;
  if (error) return <p className="text-destructive text-sm">Could not load payment settings.</p>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Payment settings" />

      <form
        className="border-border space-y-4 rounded-xl border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await save.mutateAsync({
            enabledPaymentMethods: methods,
            renewalLinkLeadDays: Number(leadDays),
            gracePeriodDays: Number(graceDays),
          });
        }}
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Enabled rails</legend>
          {RAIL_OPTIONS.map((rail) => (
            <label key={rail} className="flex min-h-[44px] items-center gap-2 text-sm capitalize">
              <input
                type="checkbox"
                checked={methods.includes(rail)}
                onChange={(event) => {
                  setMethods((current) =>
                    event.target.checked
                      ? [...current, rail]
                      : current.filter((value) => value !== rail)
                  );
                }}
              />
              {rail}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="renewal-lead-days">Renewal link lead (days)</Label>
            <Input
              id="renewal-lead-days"
              type="number"
              min={0}
              max={30}
              value={leadDays}
              onChange={(event) => setLeadDays(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grace-period-days">Grace period (days)</Label>
            <Input
              id="grace-period-days"
              type="number"
              min={0}
              max={30}
              value={graceDays}
              onChange={(event) => setGraceDays(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" className="min-h-[44px]" disabled={save.isPending}>
          Save
        </Button>
      </form>
    </div>
  );
}
