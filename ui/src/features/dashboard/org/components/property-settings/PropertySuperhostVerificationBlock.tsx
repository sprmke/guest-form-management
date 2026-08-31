import { useState } from 'react';

import { useClearAppSettingsImage } from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useUploadAppSettingsAsset } from '@/features/dashboard/bookings/hooks/useUploadAppSettingsAsset';
import { withStorageUrlCacheBust } from '@/features/dashboard/bookings/lib/storageUrls';
import {
  superhostStatusLabel,
  type SuperhostStatus,
} from '@/features/dashboard/org/lib/propertyExternalReviews';

import { ImageUploadDropzone } from '@/components/forms/ImageUploadDropzone';
import { Button } from '@/components/ui/button';
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
      <div className="space-y-1.5">
        <div className="bg-muted/40 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <p className="min-w-0 text-sm font-medium">
            Superhost
            <span className={cn('font-normal', superhostToneClass(status))}> · {statusLabel}</span>
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] shrink-0"
            onClick={() => setManageOpen(true)}
          >
            Manage
          </Button>
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
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
