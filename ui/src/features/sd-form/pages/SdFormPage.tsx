import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Loader2 } from 'lucide-react';

import { MainLayout } from '@/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import {
  fetchSdForm,
  submitSdForm,
  type SdFormBootstrap,
} from '@/features/sd-form/lib/api';
import {
  SD_BANKS,
  sdFormSubmitSchema,
  type RefundBodyValues,
  type SdBank,
} from '@/features/sd-form/lib/sdFormSchema';
import type { SubmitSdRefundBody } from '@/features/sd-form/lib/api';

type Step = 1 | 2 | 'done';

export function SdFormPage() {
  const [searchParams] = useSearchParams();
  const bookingId = (searchParams.get('bookingId') ?? '').trim();

  const [step, setStep] = useState<Step>(1);
  const [guestFeedback, setGuestFeedback] = useState('');

  const [method, setMethod] =
    useState<RefundBodyValues['method']>('same_phone');
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [bank, setBank] = useState<string>(SD_BANKS[0]);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [cashPickupNote, setCashPickupNote] = useState('');

  const query = useQuery({
    queryKey: ['sd-form', bookingId],
    queryFn: () => fetchSdForm(bookingId),
    enabled: bookingId.length > 0,
    retry: false,
  });

  const submitMut = useMutation({
    mutationFn: async (data: SdFormBootstrap) => {
      const refund =
        method === 'same_phone'
          ? { method: 'same_phone' as const, phoneConfirmed }
          : method === 'other_bank'
            ? {
                method: 'other_bank' as const,
                bank: bank as SdBank,
                accountName,
                accountNumber,
              }
            : {
                method: 'cash' as const,
                cashPickupNote: cashPickupNote.trim() || undefined,
              };
      const parsed = sdFormSubmitSchema.safeParse({ guestFeedback, refund });
      if (!parsed.success) {
        const fe = parsed.error.flatten().fieldErrors;
        const msg =
          fe.guestFeedback?.[0] ??
          fe.refund?.[0] ??
          parsed.error.errors[0]?.message ??
          'Please check the form and try again';
        throw new Error(msg);
      }
      const r = parsed.data.refund;
      const refundBody: SubmitSdRefundBody['refund'] =
        r.method === 'same_phone'
          ? { method: 'same_phone', phoneConfirmed: true }
          : r.method === 'other_bank'
            ? {
                method: 'other_bank',
                bank: r.bank,
                accountName: r.accountName,
                accountNumber: r.accountNumber,
              }
            : { method: 'cash', cashPickupNote: r.cashPickupNote ?? null };
      await submitSdForm({
        bookingId: data.bookingId,
        guestFeedback: parsed.data.guestFeedback,
        refund: refundBody,
      });
    },
    onSuccess: () => {
      setStep('done');
      toast.success('Thank you — we have received your refund details.');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Submit failed');
    },
  });

  if (!bookingId) {
    return (
      <MainLayout>
        <div className="p-6 sm:p-8 text-center space-y-3">
          <h1 className="text-base font-bold text-foreground">
            Missing booking link
          </h1>
          <p className="text-sm text-muted-foreground">
            Open this page from the link in your email, or contact us on
            Facebook if you need help.
          </p>
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (query.isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm">Loading your form…</p>
        </div>
      </MainLayout>
    );
  }

  if (query.isError || !query.data) {
    return (
      <MainLayout>
        <div className="p-6 sm:p-8 text-center space-y-3">
          <h1 className="text-base font-bold text-foreground">
            Form not available
          </h1>
          <p className="text-sm text-muted-foreground">
            {(query.error as Error)?.message ??
              'This form is not available. Please use the link from your email or contact us on Facebook.'}
          </p>
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const data = query.data;

  if (step === 'done') {
    return (
      <MainLayout>
        <div className="p-6 sm:p-8 space-y-4 text-center">
          <h1 className="text-base font-bold text-foreground">
            You&apos;re all set
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you, {data.primary_guest_name}. We&apos;ll process your
            security deposit refund using the details you shared.
          </p>
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Security deposit refund
          </p>
          <h1 className="text-base font-bold text-foreground sm:text-lg">
            Hi {data.primary_guest_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Stay {data.check_in_date} – {data.check_out_date} · Security deposit{' '}
            <span className="font-semibold text-foreground">
              ₱{Number(data.security_deposit).toLocaleString('en-PH')}
            </span>
          </p>
        </header>

        {step === 1 && (
          <StepOne
            guestFeedback={guestFeedback}
            onFeedbackChange={setGuestFeedback}
            reviewsUrl={data.facebook_reviews_url}
            onNext={() => {
              const t = guestFeedback.trim();
              if (!t) {
                toast.error(
                  'Please share a short review or feedback before continuing',
                );
                return;
              }
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <StepTwo
            data={data}
            method={method}
            onMethodChange={setMethod}
            phoneConfirmed={phoneConfirmed}
            onPhoneConfirmedChange={setPhoneConfirmed}
            bank={bank}
            onBankChange={setBank}
            accountName={accountName}
            onAccountNameChange={setAccountName}
            accountNumber={accountNumber}
            onAccountNumberChange={setAccountNumber}
            cashPickupNote={cashPickupNote}
            onCashPickupNoteChange={setCashPickupNote}
            onBack={() => setStep(1)}
            onSubmit={() => submitMut.mutate(data)}
            isSubmitting={submitMut.isPending}
          />
        )}
      </div>
    </MainLayout>
  );
}

function StepOne({
  guestFeedback,
  onFeedbackChange,
  reviewsUrl,
  onNext,
}: {
  guestFeedback: string;
  onFeedbackChange: (v: string) => void;
  reviewsUrl: string;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Before we send your refund, we&apos;d love a quick note about your stay.
        If you can, leave us a star review on Facebook too — it helps a lot.
      </p>
      <div className="space-y-2">
        <Label htmlFor="sd-feedback" className="text-sm font-medium">
          Your feedback
        </Label>
        <textarea
          id="sd-feedback"
          value={guestFeedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          rows={5}
          className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Tell us how your stay went…"
        />
      </div>
      <Button
        asChild
        variant="outline"
        className="w-full min-h-[44px] sm:w-auto"
      >
        <a
          href={reviewsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex gap-2 items-center"
        >
          Review us on Facebook
          <ExternalLink className="size-4 shrink-0" aria-hidden />
        </a>
      </Button>
      <Button type="button" className="w-full min-h-[44px]" onClick={onNext}>
        Continue
      </Button>
    </div>
  );
}

function MethodCard({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border px-3 py-3 text-left transition-colors min-h-[44px] sm:min-h-0',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
        {description}
      </p>
    </button>
  );
}

function StepTwo({
  data,
  method,
  onMethodChange,
  phoneConfirmed,
  onPhoneConfirmedChange,
  bank,
  onBankChange,
  accountName,
  onAccountNameChange,
  accountNumber,
  onAccountNumberChange,
  cashPickupNote,
  onCashPickupNoteChange,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  data: SdFormBootstrap;
  method: RefundBodyValues['method'];
  onMethodChange: (m: RefundBodyValues['method']) => void;
  phoneConfirmed: boolean;
  onPhoneConfirmedChange: (v: boolean) => void;
  bank: string;
  onBankChange: (v: string) => void;
  accountName: string;
  onAccountNameChange: (v: string) => void;
  accountNumber: string;
  onAccountNumberChange: (v: string) => void;
  cashPickupNote: string;
  onCashPickupNoteChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground leading-relaxed">
        How should we send your security deposit refund?
      </p>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Option
        </p>
        <div className="flex flex-col gap-2">
          <MethodCard
            selected={method === 'same_phone'}
            onSelect={() => onMethodChange('same_phone')}
            title="GCash — same as my phone number"
            description="Fastest if your active GCash wallet uses the mobile number you gave when you booked."
          />
          <MethodCard
            selected={method === 'other_bank'}
            onSelect={() => onMethodChange('other_bank')}
            title="Another GCash or bank account"
            description="GCash (different number), Maribank, BDO, or BPI — we only need the details you enter below."
          />
          <MethodCard
            selected={method === 'cash'}
            onSelect={() => onMethodChange('cash')}
            title="Cash pickup"
            description="We'll coordinate with you separately. You can add a short note (optional)."
          />
        </div>
      </div>

      {method === 'same_phone' && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-3">
          <p className="text-sm text-foreground">
            <span className="font-medium">Phone on file:</span>{' '}
            <span className="font-mono text-sm">
              {data.guest_phone_number || '—'}
            </span>
          </p>
          <label className="flex gap-3 items-start cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={phoneConfirmed}
              onChange={(e) => onPhoneConfirmedChange(e.target.checked)}
              className="mt-1 size-4 rounded border-input shrink-0"
            />
            <span className="text-sm leading-snug text-foreground">
              I confirm my GCash wallet uses this phone number and is active.
            </span>
          </label>
        </div>
      )}

      {method === 'other_bank' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sd-bank" className="text-sm font-medium">
              Bank / channel
            </Label>
            <select
              id="sd-bank"
              value={bank}
              onChange={(e) => onBankChange(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SD_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-acc-name" className="text-sm font-medium">
              Account name
            </Label>
            <input
              id="sd-acc-name"
              value={accountName}
              onChange={(e) => onAccountNameChange(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              placeholder="Name on the account"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-acc-no" className="text-sm font-medium">
              Account number
            </Label>
            <input
              id="sd-acc-no"
              value={accountNumber}
              onChange={(e) => onAccountNumberChange(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono"
              placeholder="Digits only"
              inputMode="numeric"
            />
          </div>
        </div>
      )}

      {method === 'cash' && (
        <div className="space-y-1.5">
          <Label htmlFor="sd-cash-note" className="text-sm font-medium">
            Note{' '}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <textarea
            id="sd-cash-note"
            value={cashPickupNote}
            onChange={(e) => onCashPickupNoteChange(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
            placeholder="Preferred time or location hints…"
          />
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="min-h-[44px] w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
              Submitting…
            </>
          ) : (
            'Submit refund details'
          )}
        </Button>
      </div>
    </div>
  );
}
