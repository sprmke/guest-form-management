import * as React from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  useClearAppSettingsImage,
  type AppSettingsFieldSource,
} from '@/features/admin/hooks/useAppSettings';
import { useUploadAppSettingsAsset } from '@/features/admin/hooks/useUploadAppSettingsAsset';

type GafOwnerSignatureUploadFieldProps = {
  disabled?: boolean;
  previewUrl: string | null;
  source?: AppSettingsFieldSource;
};

export function GafOwnerSignatureUploadField({
  disabled,
  previewUrl,
  source,
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
      toast.success('Unit Owner signature updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleReset() {
    try {
      await clearMut.mutateAsync('gafUnitOwnerSignatureUrl');
      toast.success('Signature reset to template default');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="gaf-owner-signature" className="text-sm font-medium">
        Unit Owner / SPA Signature
      </Label>
      <div className="space-y-3 pt-1">
        <div className="rounded-xl border border-border/60 bg-card p-3">
          {previewUrl ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              aria-label={hasStoredCustom ? 'Replace signature' : 'Upload signature'}
              className={cn(
                'group/signature relative mx-auto flex min-h-[88px] w-full max-w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/20 p-3',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !busy && 'cursor-pointer hover:bg-muted/30',
                busy && 'cursor-not-allowed opacity-60',
              )}
            >
              <img
                src={previewUrl}
                alt="Unit Owner signature preview"
                className={cn(
                  'max-h-24 w-auto max-w-full object-contain',
                  uploadMut.isPending && 'opacity-50',
                )}
              />
              <span
                className={cn(
                  'pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 px-3 text-center text-sm font-medium text-foreground transition-opacity motion-reduce:transition-none',
                  uploadMut.isPending
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/signature:opacity-100 group-focus-within/signature:opacity-100',
                )}
                aria-hidden
              >
                {uploadMut.isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="size-5 text-primary" />
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
                'flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !busy && 'cursor-pointer hover:bg-muted/30 hover:text-foreground',
                busy && 'cursor-not-allowed opacity-60',
              )}
            >
              {uploadMut.isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span>Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="size-5 text-primary" />
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
      </div>
    </div>
  );
}
