import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowAssetPreviewWithRemove } from '@/features/admin/components/WorkflowAssetPreviewWithRemove';
import {
  receiptAiUploadToastMessage,
  showDocumentAiModelErrorToast,
} from '@/features/admin/components/ReceiptAiVerdictBadge';
import {
  useUploadBookingAsset,
  type GuestDocAssetType,
} from '@/features/admin/hooks/useUploadBookingAsset';
import { useClearBookingAsset } from '@/features/admin/hooks/useClearBookingAsset';
import { normalizeStoragePublicUrl } from '@/features/admin/lib/storageUrls';

export type BookingGuestDocDef = {
  assetType: GuestDocAssetType;
  label: string;
  currentUrl: string | null | undefined;
  accept: string;
};

function getDocType(url: string): 'image' | 'pdf' | 'file' {
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|heic|heif)$/.test(path)) return 'image';
  if (/\.pdf$/.test(path)) return 'pdf';
  return 'file';
}

function isValidIdAssetType(assetType: GuestDocAssetType): boolean {
  return (
    assetType === 'valid_id' ||
    assetType === 'guest2_valid_id' ||
    assetType === 'guest3_valid_id' ||
    assetType === 'guest4_valid_id' ||
    assetType === 'guest5_valid_id'
  );
}

export function BookingGuestDocReplacer({
  bookingId,
  assetType,
  label,
  currentUrl,
  accept,
  onPreview,
}: BookingGuestDocDef & {
  bookingId: string;
  onPreview: (label: string, rawUrl: string) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMut = useUploadBookingAsset();
  const clearAssetMut = useClearBookingAsset();
  const [justUploaded, setJustUploaded] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const displayUrl = currentUrl
    ? (normalizeStoragePublicUrl(currentUrl) ?? currentUrl)
    : '';

  useEffect(() => {
    setThumbFailed(false);
  }, [currentUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadMut.mutateAsync({ bookingId, assetType, file });
      setJustUploaded(true);
      const validation = result.receiptValidation;
      if (validation && isValidIdAssetType(assetType)) {
        if (validation.aiModelError) {
          showDocumentAiModelErrorToast(validation.aiModelError);
        } else {
          const toastMsg = receiptAiUploadToastMessage(
            validation.verdict,
            'valid_id',
          );
          if (toastMsg?.type === 'error') {
            toast.error(toastMsg.message, { description: toastMsg.description });
          } else if (toastMsg?.type === 'warning') {
            toast.warning(toastMsg.message);
          } else if (toastMsg?.type === 'success') {
            toast.success(toastMsg.message);
          } else {
            toast.success(`${label} replaced successfully`);
          }
        }
      } else {
        toast.success(`${label} replaced successfully`);
      }
      setTimeout(() => setJustUploaded(false), 3000);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : `Failed to upload ${label}`,
      );
    }

    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleRemove() {
    setThumbFailed(false);
    setJustUploaded(false);
    if (inputRef.current) inputRef.current.value = '';
    try {
      await clearAssetMut.mutateAsync({ bookingId, assetType });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : `Failed to remove ${label}`,
      );
    }
  }

  const isLoading = uploadMut.isPending;
  const isRemoving = clearAssetMut.isPending;
  const docType = displayUrl ? getDocType(displayUrl) : 'file';
  const showImageThumb = docType === 'image' && !thumbFailed;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3.5 ring-1 ring-border/20">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/70">
        {label}
      </p>

      {currentUrl ? (
        <WorkflowAssetPreviewWithRemove
          removing={isRemoving}
          uploading={isLoading}
          removeAriaLabel={`Remove ${label}`}
          onRemove={() => void handleRemove()}
          preview={
            <button
              type="button"
              aria-label={`Preview ${label}`}
              onClick={() => void onPreview(label, currentUrl)}
              className="group flex min-h-[44px] w-full items-center gap-2 overflow-hidden rounded-lg border border-border/55 bg-card p-2 text-left transition-colors hover:border-primary/30 hover:bg-muted/20"
            >
              {showImageThumb ? (
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <img
                    src={displayUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setThumbFailed(true)}
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-500/15">
                  <FileText className="size-6 text-red-400 dark:text-red-300" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  Current file
                </p>
                <p className="flex items-center gap-0.5 text-[11px] text-blue-600 group-hover:underline dark:text-blue-400">
                  View
                </p>
              </div>
            </button>
          }
        />
      ) : (
        <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/80 text-xs text-muted-foreground">
          No file uploaded
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={isLoading}
      />
      <button
        type="button"
        disabled={isLoading || isRemoving}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
          justUploaded
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30'
            : 'bg-card text-foreground ring-1 ring-border/50 hover:bg-muted/40 hover:ring-primary/20 dark:ring-border/60',
          (isLoading || isRemoving) && 'cursor-not-allowed opacity-60',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Uploading…
          </>
        ) : justUploaded ? (
          <>
            <CheckCircle2 className="size-3.5" />
            Uploaded!
          </>
        ) : (
          <>
            <Upload className="size-3.5" />
            {currentUrl ? 'Replace file' : 'Upload file'}
          </>
        )}
      </button>
    </div>
  );
}
