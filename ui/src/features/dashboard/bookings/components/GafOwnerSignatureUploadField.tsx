import * as React from 'react';

import { Loader2, PenLine, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { SignaturePad } from '@/features/dashboard/bookings/components/SignaturePad';
import {
  SignaturePreviewBox,
  signatureFrameClassName,
} from '@/features/dashboard/bookings/components/SignaturePreviewBox';
import { useUploadAppSettingsAsset } from '@/features/dashboard/bookings/hooks/useUploadAppSettingsAsset';
import { SettingsFieldLabel } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Button } from '@/components/ui/button';
import { SlidingTabs, SlidingTabsList, SlidingTabsTrigger } from '@/components/ui/sliding-tabs';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

type SignatureInputMode = 'draw' | 'upload';

type GafOwnerSignatureUploadFieldProps = {
  disabled?: boolean;
  storedSignatureUrl?: string | null;
  currentSignatureUrl?: string | null;
  required?: boolean;
  error?: string | null;
  onSignatureSaved?: (url: string) => void;
  onPreviewUrlChange?: (url: string | null) => void;
};

export function GafOwnerSignatureUploadField({
  disabled,
  storedSignatureUrl = null,
  currentSignatureUrl = null,
  required = false,
  error = null,
  onSignatureSaved,
  onPreviewUrlChange,
}: GafOwnerSignatureUploadFieldProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const uploadMut = useUploadAppSettingsAsset();
  const [mode, setMode] = React.useState<SignatureInputMode>('draw');
  const busy = disabled || uploadMut.isPending;
  const hasCurrentSignature = Boolean(currentSignatureUrl);

  async function uploadSignatureFile(file: File): Promise<void> {
    const localPreviewUrl = URL.createObjectURL(file);
    onPreviewUrlChange?.(localPreviewUrl);
    try {
      const result = await uploadMut.mutateAsync({ assetType: 'gaf_unit_owner_signature', file });
      onPreviewUrlChange?.(result.url);
      onSignatureSaved?.(result.url);
      toast.success('Unit Owner signature updated');
    } catch (err) {
      onPreviewUrlChange?.(storedSignatureUrl);
      throw err;
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadSignatureFile(file);
    } catch (err) {
      toast.error(friendlyToastError(err, 'Upload failed'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDrawnSignature(file: File): Promise<void> {
    try {
      await uploadSignatureFile(file);
    } catch (err) {
      toast.error(friendlyToastError(err, 'Save failed'));
      throw err;
    }
  }

  return (
    <div className="space-y-1.5">
      <SettingsFieldLabel
        htmlFor="gaf-owner-signature"
        label="Unit Owner / SPA Signature"
        required={required}
      />
      <div className="space-y-3 pt-1">
        <SlidingTabs
          value={mode}
          onValueChange={(value) => setMode(value as SignatureInputMode)}
          className="w-full"
        >
          <SlidingTabsList
            size="compact"
            className="segment-shell w-full"
            aria-label="Signature input"
          >
            <SlidingTabsTrigger value="draw" className="segment-item min-h-[44px] flex-1 gap-1.5">
              <PenLine className="size-4 shrink-0" aria-hidden />
              Sign
            </SlidingTabsTrigger>
            <SlidingTabsTrigger value="upload" className="segment-item min-h-[44px] flex-1 gap-1.5">
              <Upload className="size-4 shrink-0" aria-hidden />
              Upload
            </SlidingTabsTrigger>
          </SlidingTabsList>
        </SlidingTabs>

        <div
          className={cn(
            'bg-card space-y-3 rounded-xl border p-3',
            error ? 'border-destructive' : 'border-border/60'
          )}
        >
          <div className={cn(mode !== 'draw' && 'hidden')}>
            <SignaturePad
              disabled={busy}
              saving={uploadMut.isPending}
              visible={mode === 'draw'}
              savedImageUrl={currentSignatureUrl}
              onSave={handleDrawnSignature}
              onPreviewChange={onPreviewUrlChange}
            />
          </div>

          <div className={cn('space-y-3', mode !== 'upload' && 'hidden')}>
            {hasCurrentSignature ? (
              <>
                <SignaturePreviewBox url={currentSignatureUrl} />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="min-h-[44px] w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  {uploadMut.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="size-4" aria-hidden />
                      Replace signature
                    </>
                  )}
                </Button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  signatureFrameClassName,
                  'text-muted-foreground flex flex-col items-center justify-center gap-2 px-3 text-sm',
                  'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                  !busy && 'hover:bg-muted/30 hover:text-foreground cursor-pointer',
                  busy && 'cursor-not-allowed opacity-60'
                )}
              >
                {uploadMut.isPending ? (
                  <>
                    <Loader2 className="text-primary size-5 animate-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="text-primary size-5" />
                    <span>Upload signature (PNG or JPEG)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          id="gaf-owner-signature"
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          disabled={busy}
          onChange={(e) => void handleFileChange(e)}
        />

        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </div>
  );
}
