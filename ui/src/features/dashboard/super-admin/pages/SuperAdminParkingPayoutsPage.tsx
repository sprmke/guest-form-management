import { useEffect, useState } from 'react';

import { Wallet } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import { SuperAdminEmptyState } from '@/features/dashboard/super-admin/components/shared/SuperAdminEmptyState';
import { SuperAdminPageLoading } from '@/features/dashboard/super-admin/components/shared/SuperAdminPageLoading';
import {
  type ParkingPayoutTransaction,
  useMarkParkingPayoutDisbursed,
  useParkingPayouts,
  usePlatformParkingSettings,
  useRecordParkingPayoutClawback,
  useUpdatePlatformParkingSettings,
} from '@/features/dashboard/super-admin/hooks/usePlatformParkingSettings';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { appPageTitle, usePageTitle } from '@/lib/pageTitle';

function formatPhp(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MarkDisbursedDialog({ transaction }: { transaction: ParkingPayoutTransaction }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const markDisbursed = useMarkParkingPayoutDisbursed();

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-[44px]">
          Mark disbursed
        </Button>
      </ResponsiveModalTrigger>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Mark payout as disbursed</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Confirms {formatPhp(transaction.hostNetTotal)} was manually paid out to the host for
            this booking. Reference is optional (e.g. bank transfer/GCash reference number).
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <div className="space-y-1.5">
          <Label htmlFor="disbursement-reference">Reference (optional)</Label>
          <Input
            id="disbursement-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
        <ResponsiveModalFooter>
          <Button
            type="button"
            disabled={markDisbursed.isPending}
            className="min-h-[44px]"
            onClick={async () => {
              await markDisbursed.mutateAsync({
                transactionId: transaction.id,
                reference: reference.trim() || undefined,
              });
              setOpen(false);
              setReference('');
            }}
          >
            Confirm disbursed
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

function RecordClawbackDialog({ transaction }: { transaction: ParkingPayoutTransaction }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const recordClawback = useRecordParkingPayoutClawback();

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="min-h-[44px]">
          Record clawback
        </Button>
      </ResponsiveModalTrigger>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Record a clawback</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Audit trail only (e.g. a chargeback after disbursement) — no automated collection
            happens here.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="clawback-amount">Amount (₱)</Label>
            <Input
              id="clawback-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clawback-reason">Reason</Label>
            <Textarea
              id="clawback-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>
        <ResponsiveModalFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={recordClawback.isPending || !amount || !reason.trim()}
            className="min-h-[44px]"
            onClick={async () => {
              await recordClawback.mutateAsync({
                transactionId: transaction.id,
                amount: Number(amount),
                reason: reason.trim(),
              });
              setOpen(false);
              setAmount('');
              setReason('');
            }}
          >
            Confirm clawback
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}

function ParkingSettingsCard() {
  const { data, isLoading, error } = usePlatformParkingSettings();
  const save = useUpdatePlatformParkingSettings();
  const [commissionPct, setCommissionPct] = useState('10');
  const [directCommissionPct, setDirectCommissionPct] = useState('5');
  const [weekday, setWeekday] = useState('400');
  const [weekend, setWeekend] = useState('400');
  const [escalationPhone, setEscalationPhone] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!data || initialized) return;
    setCommissionPct(String(Math.round(data.commissionPct * 1000) / 10));
    setDirectCommissionPct(String(Math.round(data.directCommissionPct * 1000) / 10));
    setWeekday(String(data.guestRateWeekday));
    setWeekend(String(data.guestRateWeekend));
    setEscalationPhone(data.supportEscalationPhone ?? '');
    setInitialized(true);
  }, [data, initialized]);

  if (isLoading && !data) return <SuperAdminPageLoading metricCount={2} />;
  if (error) return <p className="text-destructive text-sm">Could not load parking settings.</p>;

  return (
    <form
      className="border-border space-y-4 rounded-xl border p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await save.mutateAsync({
          commissionPct: Number(commissionPct) / 100,
          directCommissionPct: Number(directCommissionPct) / 100,
          guestRateWeekday: Number(weekday),
          guestRateWeekend: Number(weekend),
          supportEscalationPhone: escalationPhone.trim(),
        });
      }}
    >
      <h2 className="text-sm font-semibold">Commission &amp; guest rate</h2>
      <p className="text-muted-foreground text-sm">
        Guest rate is what riders are charged per night and doubles as the price cap that excludes
        hosts priced above it from matching. Commission is taken from the host's gross rate. Changes
        only apply to bookings created after saving — already-paid transactions keep their original
        snapshotted values.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="commission-pct">Commission (%)</Label>
          <Input
            id="commission-pct"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={commissionPct}
            onChange={(event) => setCommissionPct(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="direct-commission-pct">Direct-link commission (%)</Label>
          <Input
            id="direct-commission-pct"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={directCommissionPct}
            onChange={(event) => setDirectCommissionPct(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-rate-weekday">Guest rate — weekday (₱/night)</Label>
          <Input
            id="guest-rate-weekday"
            type="number"
            min={0}
            step={1}
            value={weekday}
            onChange={(event) => setWeekday(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guest-rate-weekend">Guest rate — weekend (₱/night)</Label>
          <Input
            id="guest-rate-weekend"
            type="number"
            min={0}
            step={1}
            value={weekend}
            onChange={(event) => setWeekend(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="support-escalation-phone">Support escalation phone</Label>
        <Input
          id="support-escalation-phone"
          type="tel"
          placeholder="e.g. +63 900 000 0000"
          value={escalationPhone}
          onChange={(event) => setEscalationPhone(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          Shown to guests on the parking status page for an unresponsive host. Optional.
        </p>
      </div>
      <Button type="submit" className="min-h-[44px]" disabled={save.isPending}>
        Save
      </Button>
    </form>
  );
}

function PayoutsLedger() {
  const { data, isLoading, error } = useParkingPayouts();

  if (isLoading && !data) return <SuperAdminPageLoading metricCount={3} />;
  if (error) return <p className="text-destructive text-sm">Could not load the payout ledger.</p>;

  const transactions = data ?? [];
  if (transactions.length === 0) {
    return <SuperAdminEmptyState icon={Wallet} title="No paid parking bookings yet" />;
  }

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Net payout</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((txn) => (
            <TableRow key={txn.id}>
              <TableCell>
                <div className="font-medium">{txn.guestName ?? 'Guest'}</div>
                <div className="text-muted-foreground text-xs">
                  {txn.checkInDate ?? '—'} → {txn.checkOutDate ?? '—'} · {txn.nights} night
                  {txn.nights === 1 ? '' : 's'}
                </div>
              </TableCell>
              <TableCell>
                <div>{txn.parkingName ?? '—'}</div>
                <div className="text-muted-foreground text-xs">{txn.organizationName ?? '—'}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{formatPhp(txn.hostNetTotal)}</div>
                <div className="text-muted-foreground text-xs">
                  Gross {formatPhp(txn.hostGrossTotal)} · Commission{' '}
                  {(txn.commissionPct * 100).toFixed(1)}%
                  {txn.bookingChannel === 'direct_link' ? ' · Direct link' : ''}
                </div>
                {txn.clawbackAmount != null ? (
                  <div className="text-destructive text-xs">
                    Clawback: {formatPhp(txn.clawbackAmount)}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                {txn.disbursedAt ? (
                  <Badge variant="secondary">Disbursed</Badge>
                ) : (
                  <Badge variant="outline">Awaiting disbursement</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap justify-end gap-2">
                  {!txn.disbursedAt ? <MarkDisbursedDialog transaction={txn} /> : null}
                  <RecordClawbackDialog transaction={txn} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SuperAdminParkingPayoutsPage() {
  usePageTitle(appPageTitle('Parking payouts'));

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Parking payouts"
        subtitle="Commission/guest-rate config and the manual host disbursement ledger for the parkings vertical."
      />
      <ParkingSettingsCard />
      <PayoutsLedger />
    </div>
  );
}
