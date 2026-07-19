import * as React from 'react';

import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import {
  useClearAppSettingsImage,
  type AppSettingsFieldSource,
} from '@/features/dashboard/bookings/hooks/useAppSettings';
import { useUploadAppSettingsAsset } from '@/features/dashboard/bookings/hooks/useUploadAppSettingsAsset';
import { SettingsFieldLabel } from '@/features/dashboard/org/components/property-settings/PropertySettingsFields';

import { Button } from '@/components/ui/button';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

type GafOwnerSignatureUploadFieldProps = {
  disabled?: boolean;
  previewUrl: string | null;
  source?: AppSettingsFieldSource;
  required?: boolean;
  error?: string | null;
  onUploaded?: () => void;
};

export function GafOwnerSignatureUploadField({
  disabled,
  previewUrl,
  source,
  required = false,
  error = null,
  onUploaded,
}: GafOwnerSignatureUploadFieldProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const uploadMut = useUploadAppSettingsAsset();
  const clearMut = useClearAppSettingsImage();
  const busy = disabled || uploadMut.isPending || clearMut.isPending;
  const hasStoredCustom = source === 'db' && !!previewUrl;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMut.mutateAsync({ assetType: 'gaf_unit_owner_signature', file });
      onUploaded?.();
      toast.success('Unit Owner signature updated');
    } catch (err) {
      toast.error(friendlyToastError(err, 'Upload failed'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleReset() {
    try {
      await clearMut.mutateAsync('gafUnitOwnerSignatureUrl');
      onUploaded?.();
      toast.success('Signature reset to template default');
    } catch (err) {
      toast.error(friendlyToastError(err, 'Reset failed'));
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
        <div
          className={cn(
            'bg-card rounded-xl border p-3',
            error ? 'border-destructive' : 'border-border/60'
          )}
        >
          {previewUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              aria-label={hasStoredCustom ? 'Replace signature' : 'Upload signature'}
              className={cn(
                'group/signature border-border bg-muted/20 relative mx-auto flex min-h-[88px] w-full max-w-full items-center justify-center overflow-hidden rounded-lg border border-dashed p-3',
                'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
                !busy && 'hover:bg-muted/30 cursor-pointer',
                busy && 'cursor-not-allowed opacity-60'
              )}
            >
              <img
                src={previewUrl}
                alt="Unit Owner signature preview"
                className={cn(
                  'max-h-24 w-auto max-w-full object-contain',
                  uploadMut.isPending && 'opacity-50'
                )}
              />
              <span
                className={cn(
                  'bg-background/80 text-foreground pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-sm font-medium transition-opacity motion-reduce:transition-none',
                  uploadMut.isPending
                    ? 'opacity-100'
                    : 'opacity-0 group-focus-within/signature:opacity-100 group-hover/signature:opacity-100'
                )}
                aria-hidden
              >
                {uploadMut.isPending ? (
                  <>
                    <Loader2 className="text-primary size-5 animate-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="text-primary size-5" />
                    <span>{hasStoredCustom ? 'Replace signature' : 'Upload signature'}</span>
                  </>
                )}
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-border bg-muted/20 text-muted-foreground flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm',
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
        <input
          ref={fileRef}
          id="gaf-owner-signature"
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          disabled={busy}
          onChange={(e) => void handleFileChange(e)}
        />
        {hasStoredCustom ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-[44px]"
            onClick={() => void handleReset()}
          >
            {clearMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Reset to template default'
            )}
          </Button>
        ) : null}
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </div>
    </div>
  );
}
