import { useRef, type ChangeEvent } from 'react';

import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import {
  OrgSettingsField,
  OrgSettingsFieldSpan,
} from '@/features/dashboard/org/components/org-settings/OrgSettingsFields';
import {
  useClearOrgSettingsImage,
  type OrgSettingsFieldSource,
} from '@/features/dashboard/org/hooks/useOrgSettings';
import { useUploadOrgSettingsAsset } from '@/features/dashboard/org/hooks/useUploadOrgSettingsAsset';

import { Button } from '@/components/ui/button';
import { friendlyToastError } from '@/lib/feedback/toastMessages';
import { cn } from '@/lib/utils';

export function OrgSettingsImageField({
  id,
  label,
  hint,
  source,
  disabled,
  imageUrl,
  previewAlt,
  previewClassName = 'block h-auto max-h-40 w-auto max-w-full object-contain',
  uploadLabel = 'Upload image',
  replaceLabel = 'Replace image',
}: {
  id: string;
  label: string;
  hint?: string;
  source?: OrgSettingsFieldSource;
  disabled?: boolean;
  imageUrl: string;
  previewAlt: string;
  previewClassName?: string;
  uploadLabel?: string;
  replaceLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadOrgSettingsAsset();
  const clearMut = useClearOrgSettingsImage();
  const busy = disabled || uploadMut.isPending || clearMut.isPending;
  const hasStoredCustom = source === 'db';

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadMut.mutateAsync(file);
      toast.success(`${label} updated`);
    } catch (err) {
      toast.error(friendlyToastError(err, 'Upload failed'));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleReset() {
    try {
      await clearMut.mutateAsync();
      toast.success(`${label} reset to default`);
    } catch (err) {
      toast.error(friendlyToastError(err, 'Reset failed'));
    }
  }

  return (
    <OrgSettingsFieldSpan>
      <OrgSettingsField id={id} label={label}>
        {hint ? <p className="text-muted-foreground text-xs leading-snug">{hint}</p> : null}
        <div className="space-y-3">
          <div className="border-border/60 bg-card mx-auto flex w-fit max-w-full justify-center rounded-xl border p-3">
            <div className="group/image relative inline-block max-w-full">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                aria-label={hasStoredCustom ? replaceLabel : uploadLabel}
                className={cn(
                  'relative block max-w-full overflow-hidden rounded-lg border-0 bg-transparent p-0',
                  'focus-visible:ring-ring focus-visible:ring-offset-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  !busy && 'cursor-pointer',
                  busy && !uploadMut.isPending && 'cursor-not-allowed opacity-60'
                )}
              >
                <img
                  src={imageUrl}
                  alt={previewAlt}
                  className={cn(previewClassName, uploadMut.isPending && 'opacity-50')}
                />
                <span
                  className={cn(
                    'bg-background/80 text-foreground pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-sm font-medium transition-opacity motion-reduce:transition-none',
                    uploadMut.isPending
                      ? 'opacity-100'
                      : 'opacity-0 group-focus-within/image:opacity-100 group-hover/image:opacity-100'
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
                      <span>{hasStoredCustom ? replaceLabel : uploadLabel}</span>
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(event) => void handleFileChange(event)}
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
                'Reset to default'
              )}
            </Button>
          ) : null}
        </div>
      </OrgSettingsField>
    </OrgSettingsFieldSpan>
  );
}
