import { useState } from 'react';

import { Award } from 'lucide-react';

import { useClearAppSettingsImage } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useUploadAppSettingsAsset } from '@/features/dashboard/bookings/hooks/useUploadAppSettingsAsset';
import { withStorageUrlCacheBust } from '@/features/dashboard/bookings/lib/storageUrls';
import {
  superhostStatusLabel,
  type SuperhostStatus,
} from '@/features/dashboard/org/lib/propertyExternalReviews';

import { ImageUploadDropzone } from '@/components/forms/ImageUploadDropzone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { cn } from '@/lib/utils';

function superhostToneClass(status: SuperhostStatus): string {
  switch (status) {
    case 'approved':
      return 'font-medium text-emerald-800 dark:text-emerald-300';
    case 'pending':
      return 'text-amber-800/90 dark:text-amber-200';
    case 'rejected':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}

function SuperhostProofUpload({
  imageUrl,
  disabled,
  onUploaded,
  onClear,
}: {
  imageUrl: string | null;
  disabled?: boolean;
  onUploaded: (url: string) => void;
  onClear: () => void;
}) {
  const uploadMut = useUploadAppSettingsAsset();
  const clearMut = useClearAppSettingsImage();
  const busy = disabled || uploadMut.isPending || clearMut.isPending;
  const displaySrc = imageUrl?.trim() ? withStorageUrlCacheBust(imageUrl, null) : null;

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    try {
      const result = await uploadMut.mutateAsync({
        assetType: 'superhost_proof',
        file,
      });
      onUploaded(result.url);
    } catch {
      // Caller handles persistence; mutation errors stay on the hook.
    }
  }

  async function handleRemove() {
    try {
      await clearMut.mutateAsync('superhostProofImageUrl');
      onClear();
    } catch {
      // Caller handles persistence; mutation errors stay on the hook.
    }
  }

  return (
    <div className="border-border/60 bg-card w-full rounded-xl border p-3">
      <ImageUploadDropzone
        id="superhost-proof-upload"
        imageUrl={displaySrc}
        uploading={uploadMut.isPending || clearMut.isPending}
        disabled={busy}
        emptyLabel="Proof screenshot"
        previewClassName="absolute inset-0 size-full object-cover"
        onFileSelect={(file) => void handleFileChange(file)}
        onRemove={() => void handleRemove()}
      />
    </div>
  );
}

export function PropertySuperhostVerificationBlock({
  verificationUrl,
  proofImageUrl,
  status,
  disabled,
  error,
  onVerificationUrlChange,
  onInteract,
}: {
  verificationUrl: string;
  proofImageUrl: string;
  status: SuperhostStatus;
  disabled?: boolean;
  error?: string | null;
  onVerificationUrlChange: (url: string) => void;
  onInteract: () => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const statusLabel = superhostStatusLabel(status);

  return (
    <>
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="border-border bg-background flex size-10 shrink-0 items-center justify-center rounded-lg border sm:size-11">
                <Award className="text-primary size-5 sm:size-[22px]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sidebar-foreground text-sm font-bold sm:text-[13px]">
                  Superhost
                </h3>
                <p className={cn('mt-1.5 text-xs sm:text-[11px]', superhostToneClass(status))}>
                  {statusLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className={cn(
                'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4',
                'border-primary/30 bg-primary/5 text-primary border text-sm font-semibold sm:w-auto sm:text-[13px]',
                'hover:border-primary/40 hover:bg-primary/10 transition-colors'
              )}
            >
              Manage
            </button>
          </div>
          {error ? <p className="text-destructive mt-3 text-xs">{error}</p> : null}
        </div>
      </div>

      <ResponsiveModal open={manageOpen} onOpenChange={setManageOpen}>
        <ResponsiveModalContent className="max-h-[min(90dvh,640px)] max-w-[min(calc(100vw-1.5rem),32rem)] overflow-y-auto">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Superhost</ResponsiveModalTitle>
          </ResponsiveModalHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="property-superhost-verification-url">Verification URL</Label>
              <Input
                id="property-superhost-verification-url"
                type="url"
                disabled={disabled}
                value={verificationUrl}
                onChange={(event) => {
                  onInteract();
                  onVerificationUrlChange(event.target.value);
                }}
                className={cn('h-10', error && 'border-destructive')}
                placeholder="https://www.airbnb.com/users/profile/…"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(error)}
              />
              {error ? <p className="text-destructive text-xs">{error}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label>Proof screenshot</Label>
              <SuperhostProofUpload
                imageUrl={proofImageUrl || null}
                disabled={disabled}
                onUploaded={() => onInteract()}
                onClear={() => onInteract()}
              />
            </div>
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
