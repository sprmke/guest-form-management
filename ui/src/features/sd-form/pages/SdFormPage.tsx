import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ExternalLink, Loader2, Wallet } from 'lucide-react';

import { KameFormBrandHeader } from '@/components/KameFormBrandHeader';
import { MainLayout } from '@/layouts/MainLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
  claimSdVoucher,
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
import { findVoucher, type Voucher } from '@/features/sd-form/lib/voucher';
import { VoucherReveal } from '@/features/sd-form/components/VoucherReveal';

type Step = 1 | 2 | 'done';
/**
 * Step 1 sub-phases:
 * - 'review'  → "Review us on Facebook" CTA + intro greeting.
 * - 'voucher' → randomized slot-machine reveal + "Continue to refund process".
 *
 * If a voucher was already awarded on a prior visit, /sd-form jumps straight
 * to 'voucher' so the guest re-sees the same code (no re-roll).
 */
type Step1Phase = 'review' | 'voucher';

const SD_FORM_BRAND_TITLE = 'SD Refund Form';

/** Shown when guest selects cash pickup (no free-text note; coordinate via Facebook/Airbnb). */
const CASH_SD_REFUND_NOTICE =
  'For cash SD refund, this is only applicable if you pay your Balance and SD payment via cash. Also, we can only proceed with cash refund if our staff is available and on the Azure premises. Please contact us separately on Facebook/Airbnb to discuss before leaving Azure building.';

function StepperStepRow({
  stepNum,
  short,
  label,
  hint,
  activeStep,
}: {
  stepNum: 1 | 2;
  short: string;
  label: string;
  hint: string;
  activeStep: 1 | 2;
}) {
  const done = activeStep > stepNum;
  const current = activeStep === stepNum;
  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm transition-colors',
          done &&
            'border-primary bg-primary text-primary-foreground shadow-primary/25',
          current &&
            !done &&
            'border-primary bg-primary/15 text-primary ring-2 ring-primary/25',
          !current &&
            !done &&
            'border-muted-foreground/25 bg-muted/40 text-muted-foreground',
        )}
        aria-current={current ? 'step' : undefined}
      >
        {done ? (
          <Check className="size-5" strokeWidth={2.5} aria-hidden />
        ) : (
          stepNum
        )}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider sm:text-xs',
            current || done ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
        <p className="hidden text-xs text-muted-foreground sm:block">{hint}</p>
      </div>
    </li>
  );
}

function SdFormStepper({ activeStep }: { activeStep: 1 | 2 }) {
  return (
    <nav
      aria-label="Form steps"
      className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card px-3 py-4 sm:px-5"
    >
      <ol className="flex w-full items-stretch gap-2 sm:gap-3">
        <StepperStepRow
          stepNum={1}
          short="Review"
          label="Facebook review"
          hint="Your feedback helps us improve"
          activeStep={activeStep}
        />
        <li
          className="flex shrink-0 items-center self-center px-0.5 sm:px-1"
          aria-hidden
        >
          <div
            className={cn(
              'h-0.5 w-8 rounded-full sm:w-14',
              activeStep > 1 ? 'bg-primary' : 'bg-border',
            )}
          />
        </li>
        <StepperStepRow
          stepNum={2}
          short="Payout"
          label="Refund details"
          hint="Refund process for your security deposit"
          activeStep={activeStep}
        />
      </ol>
    </nav>
  );
}

export function SdFormPage() {
  const [searchParams] = useSearchParams();
  const bookingId = (searchParams.get('bookingId') ?? '').trim();

  const [step, setStep] = useState<Step>(1);
  const [step1Phase, setStep1Phase] = useState<Step1Phase>('review');

  const [method, setMethod] =
    useState<RefundBodyValues['method']>('same_phone');
  const [bank, setBank] = useState<string>(SD_BANKS[0]);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const query = useQuery({
    queryKey: ['sd-form', bookingId],
    queryFn: () => fetchSdForm(bookingId),
    enabled: bookingId.length > 0,
    retry: false,
  });

  const existingVoucher = query.data?.next_stay_voucher_code
    ? findVoucher(query.data.next_stay_voucher_code)
    : null;

  // If a voucher was already awarded on a prior visit, jump straight to the
  // voucher view so the guest doesn't see the FB review CTA again.
  useEffect(() => {
    if (existingVoucher && step1Phase === 'review') {
      setStep1Phase('voucher');
    }
  }, [existingVoucher, step1Phase]);

  const claimMut = useMutation({
    mutationFn: async (): Promise<Voucher> => {
      const res = await claimSdVoucher(bookingId);
      const v = findVoucher(res.code);
      if (!v) {
        throw new Error('Received an unknown voucher code from the server.');
      }
      return v;
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Could not reveal your voucher just yet.');
    },
  });

  const submitMut = useMutation({
    mutationFn: async (data: SdFormBootstrap) => {
      const refund =
        method === 'same_phone'
          ? { method: 'same_phone' as const }
          : method === 'other_bank'
            ? {
                method: 'other_bank' as const,
                bank: bank as SdBank,
                accountName,
                accountNumber,
              }
            : { method: 'cash' as const };
      const parsed = sdFormSubmitSchema.safeParse({ refund });
      if (!parsed.success) {
        const fe = parsed.error.flatten().fieldErrors;
        const msg =
          fe.refund?.[0] ??
          parsed.error.errors[0]?.message ??
          'Please check the form and try again';
        throw new Error(msg);
      }
      const r = parsed.data.refund;
      const refundBody: SubmitSdRefundBody['refund'] =
        r.method === 'same_phone'
          ? { method: 'same_phone' }
          : r.method === 'other_bank'
            ? {
                method: 'other_bank',
                bank: r.bank,
                accountName: r.accountName,
                accountNumber: r.accountNumber,
              }
            : { method: 'cash' };
      await submitSdForm({
        bookingId: data.bookingId,
        refund: refundBody,
      });
    },
    onSuccess: () => {
      setStep('done');
      toast.success(
        'Thank you — we have received your security deposit refund information.',
      );
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Submit failed');
    },
  });

  if (!bookingId) {
    return (
      <MainLayout>
        <div className="relative space-y-6 p-4 text-center sm:p-6 lg:p-8">
          <KameFormBrandHeader title={SD_FORM_BRAND_TITLE} />
          <div className="space-y-3">
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
        </div>
      </MainLayout>
    );
  }

  if (query.isLoading) {
    return (
      <MainLayout>
        <div className="relative space-y-8 p-4 sm:p-6 lg:p-8">
          <KameFormBrandHeader title={SD_FORM_BRAND_TITLE} />
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm">Loading your form…</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (query.isError || !query.data) {
    return (
      <MainLayout>
        <div className="relative space-y-6 p-4 text-center sm:p-6 lg:p-8">
          <KameFormBrandHeader title={SD_FORM_BRAND_TITLE} />
          <div className="space-y-3">
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
        </div>
      </MainLayout>
    );
  }

  const data = query.data;

  if (step === 'done') {
    return (
      <MainLayout>
        <div className="relative space-y-6 p-4 text-center sm:p-6 lg:p-8">
          <KameFormBrandHeader title={SD_FORM_BRAND_TITLE} />
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="size-7" strokeWidth={2.5} aria-hidden />
          </div>
          <h1 className="text-base font-bold text-foreground sm:text-lg">
            You&apos;re all set
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
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

  const showGreeting = step === 1 && step1Phase === 'review';

  return (
    <MainLayout>
      <div className="relative space-y-6 p-4 sm:p-6 lg:p-8">
        <KameFormBrandHeader title={SD_FORM_BRAND_TITLE} />
        <SdFormStepper activeStep={step === 1 ? 1 : 2} />

        {showGreeting && (
          <header className="space-y-4 border-b border-border/60 px-5 pb-5">
            <h1 className="text-base font-bold text-foreground sm:text-lg">
              Hi {data.primary_guest_name},
            </h1>
            <div className="space-y-3 text-base leading-relaxed text-muted-foreground">
              <p>
                It was a pleasure hosting you at Kame Home! We truly appreciate
                you choosing us, and we hope you had a comfortable stay filled
                with great memories.
              </p>
              <p>
                Before we process your security deposit refund, we’d love to
                hear about your stay! We’d really appreciate it if you could
                leave us a review on our Facebook page and share your favorite
                moments (photos or videos) with your loved ones.
              </p>
            </div>
          </header>
        )}

        {step === 1 && step1Phase === 'review' && (
          <StepOneReview
            reviewsUrl={data.facebook_reviews_url}
            onReviewOpened={() => setStep1Phase('voucher')}
          />
        )}

        {step === 1 && step1Phase === 'voucher' && (
          <VoucherReveal
            facebookReviewsUrl={data.facebook_reviews_url}
            existingVoucher={existingVoucher}
            isClaiming={claimMut.isPending}
            onClaim={() => claimMut.mutateAsync()}
            onContinue={() => setStep(2)}
            primaryGuestName={data.primary_guest_name}
            checkInDate={data.check_in_date}
            checkOutDate={data.check_out_date}
          />
        )}

        {step === 2 && (
          <StepTwo
            data={data}
            method={method}
            onMethodChange={setMethod}
            bank={bank}
            onBankChange={setBank}
            accountName={accountName}
            onAccountNameChange={setAccountName}
            accountNumber={accountNumber}
            onAccountNumberChange={setAccountNumber}
            onBack={() => setStep(1)}
            onSubmit={() => submitMut.mutate(data)}
            isSubmitting={submitMut.isPending}
          />
        )}
      </div>
    </MainLayout>
  );
}

/**
 * Step 1 — review prompt.
 *
 * Shown until the guest opens the Facebook review link. After that,
 * `onReviewOpened` swaps the parent to the voucher reveal phase, which fully
 * replaces this section (and the greeting above) per the new flow.
 */
function StepOneReview({
  reviewsUrl,
  onReviewOpened,
}: {
  reviewsUrl: string;
  onReviewOpened: () => void;
}) {
  return (
    <div className="space-y-5">
      <Button
        asChild
        variant="outline"
        className="min-h-[48px] w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <a
          href={reviewsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2"
          onClick={onReviewOpened}
        >
          Review us on Facebook
          <ExternalLink className="size-4 shrink-0" aria-hidden />
        </a>
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We've got a little surprise for you after you leave a review.
      </p>
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
  /** Omit for a single-line option (title only). */
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full min-h-[44px] rounded-xl border px-3 py-3 text-left transition-colors sm:min-h-0',
        selected
          ? 'border-2 border-primary bg-primary/5'
          : 'border border-border bg-card hover:bg-muted/40',
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {description}
        </p>
      ) : null}
    </button>
  );
}

function StepTwo({
  data,
  method,
  onMethodChange,
  bank,
  onBankChange,
  accountName,
  onAccountNameChange,
  accountNumber,
  onAccountNumberChange,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  data: SdFormBootstrap;
  method: RefundBodyValues['method'];
  onMethodChange: (m: RefundBodyValues['method']) => void;
  bank: string;
  onBankChange: (v: string) => void;
  accountName: string;
  onAccountNameChange: (v: string) => void;
  accountNumber: string;
  onAccountNumberChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/15 px-4 py-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Wallet className="size-4" aria-hidden />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Choose how you&apos;d like to receive your security deposit refund.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Option
        </p>
        <div className="flex flex-col gap-2">
          <MethodCard
            selected={method === 'same_phone'}
            onSelect={() => onMethodChange('same_phone')}
            title={`GCash - ${(data.guest_phone_number ?? '').trim() || '—'}`}
            description="Same as the provided phone number from the guest form"
          />
          <MethodCard
            selected={method === 'other_bank'}
            onSelect={() => onMethodChange('other_bank')}
            title="Another GCash or bank account"
            description="Provide different GCash or bank details"
          />
          <MethodCard
            selected={method === 'cash'}
            onSelect={() => onMethodChange('cash')}
            title="Cash pickup"
          />
        </div>
      </div>

      {method === 'other_bank' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sd-bank" className="text-sm font-medium">
              Bank / channel
            </Label>
            <Select value={bank} onValueChange={onBankChange}>
              <SelectTrigger
                id="sd-bank"
                className="bg-background font-normal text-foreground"
              >
                <SelectValue placeholder="Choose bank" />
              </SelectTrigger>
              <SelectContent position="popper">
                {SD_BANKS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <div
          className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3"
          role="note"
        >
          <p className="text-sm leading-relaxed text-amber-950">
            {CASH_SD_REFUND_NOTICE}
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
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
          className="min-h-[44px] w-full shadow-md shadow-primary/15 sm:w-auto"
          disabled={isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            'Submit security deposit refund'
          )}
        </Button>
      </div>
    </div>
  );
}
