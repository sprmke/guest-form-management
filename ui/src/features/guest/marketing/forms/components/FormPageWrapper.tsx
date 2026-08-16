import { useState } from 'react';

import { Link } from 'react-router-dom';

import { Shield, ClipboardList } from 'lucide-react';

import type { GuestForm } from '@/features/guest/marketing/forms/lib/guest-forms/types';
import { PropertyPageHeader } from '@/features/guest/marketing/properties/components/PropertyPageHeader';

import { FormPageToolbar } from './FormPageToolbar';
import { FormSuccess } from './FormSuccess';
import { PublicFormRenderer } from './PublicFormRenderer';

interface FormPageWrapperProps {
  form: GuestForm;
  propertyId?: string;
  propertyName: string;
  propertyLocation: string;
  propertyImage: string;
  hostName?: string;
  rating?: number;
  reviews?: number;
  isSuperhost?: boolean;
  propertyType?: string;
  guests?: number;
  bedrooms?: number;
  /** Custom URL for the header back-link (defaults to /properties/[propertyId]) */
  backUrl?: string;
  /** Custom label for the header back-link hint text */
  backLabel?: string;
  /** 'property' | 'development' — affects header label copy */
  sourceType?: 'property' | 'development';
  /** When set, replaces the mock sleep()+fake-id submit with a real edge call. */
  onSubmit?: (data: Record<string, unknown>) => Promise<{ submissionId: string }>;
  /** When set, the success screen links to this URL for tracking the submission. */
  buildStatusUrl?: (submissionId: string) => string;
}

export function FormPageWrapper({
  form,
  propertyId,
  propertyName,
  propertyLocation,
  propertyImage,
  hostName,
  rating,
  reviews,
  isSuperhost,
  propertyType,
  guests,
  bedrooms,
  backUrl,
  backLabel,
  sourceType = 'property',
  onSubmit,
  buildStatusUrl,
}: FormPageWrapperProps) {
  const resolvedBackLabel =
    backLabel ?? (sourceType === 'development' ? 'View development' : 'View property');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | undefined>();

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (onSubmit) {
      const result = await onSubmit(data);
      setSubmissionId(result.submissionId);
      setIsSubmitted(true);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const id = `KH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setSubmissionId(id);
    setIsSubmitted(true);
  };

  const hostPropertySlug = sourceType === 'property' ? propertyId : undefined;

  return (
    <div className="bg-background min-h-screen pb-24 pt-16">
      <FormPageToolbar propertySlug={hostPropertySlug} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          {/* ── Property / Development header card ── */}
          <PropertyPageHeader
            propertySlug={propertyId ?? ''}
            propertyName={propertyName}
            propertyLocation={propertyLocation}
            propertyImage={propertyImage}
            hostName={hostName}
            rating={rating}
            reviews={reviews}
            isSuperhost={isSuperhost}
            propertyType={propertyType}
            guests={guests}
            bedrooms={bedrooms}
            checkInTime="2:00 PM"
            checkOutTime="11:00 AM"
            pageLabel={sourceType === 'development' ? 'Development Form' : 'Guest Form'}
            backUrl={backUrl}
            backLabel={resolvedBackLabel}
          />

          {/* ── Form card ── */}
          {isSubmitted ? (
            <FormSuccess
              message={form.settings.successMessage}
              formName={form.name}
              submissionId={submissionId}
              propertyId={propertyId}
              propertyName={propertyName}
              statusUrl={submissionId && buildStatusUrl ? buildStatusUrl(submissionId) : undefined}
            />
          ) : (
            <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-[0_4px_40px_-12px_rgba(0,0,0,0.10)]">
              {/* Form header */}
              <div className="border-border flex items-center gap-3 border-b px-6 py-5 sm:px-8">
                <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
                  <ClipboardList className="text-primary h-4 w-4" />
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">
                    Guest Form
                  </p>
                  <h2 className="text-foreground text-lg font-bold sm:text-xl">{form.name}</h2>
                </div>
              </div>

              {/* Form body */}
              <div className="px-6 py-7 sm:px-8 sm:py-8">
                <PublicFormRenderer form={form} onSubmit={handleSubmit} />
              </div>
            </div>
          )}

          {/* Security note */}
          {!isSubmitted && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-muted-foreground text-xs">
                  Your data is encrypted and secure
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                Powered by{' '}
                <Link
                  to="/"
                  className="text-foreground font-medium underline-offset-4 hover:underline"
                >
                  Kame Homes
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
