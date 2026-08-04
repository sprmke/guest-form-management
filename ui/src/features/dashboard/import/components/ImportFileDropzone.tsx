import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import * as React from 'react';

import type { Property } from '@/features/dashboard/org/types';
import { useImportParseFile } from '@/features/dashboard/import/hooks/useImportParseFile';
import { downloadImportCsvTemplate } from '@/features/dashboard/import/lib/importCsvTemplate';
import {
  IMPORT_ACCEPT,
  IMPORT_LIMITS_HINT,
  validateImportCsvFile,
} from '@/features/dashboard/import/lib/importUploadLimits';
import type { ImportParseResult } from '@/features/dashboard/import/types/importParse';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  properties?: Property[];
  disabled?: boolean;
  onParsed?: (result: ImportParseResult) => void;
  onError?: (message: string) => void;
  className?: string;
};

export function ImportFileDropzone({
  id = 'import-csv-file',
  properties = [],
  disabled = false,
  onParsed,
  onError,
  className,
}: Props) {
  const parseFile = useImportParseFile();
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [lastResult, setLastResult] = React.useState<ImportParseResult | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const busy = disabled || parseFile.isPending;

  const reportError = React.useCallback(
    (message: string) => {
      setLocalError(message);
      onError?.(message);
    },
    [onError]
  );

  const uploadFile = React.useCallback(
    async (file: File) => {
      setLocalError(null);
      setLastResult(null);

      const validationError = validateImportCsvFile(file);
      if (validationError) {
        reportError(validationError);
        return;
      }

      setSelectedFile(file);
      try {
        const result = await parseFile.mutateAsync(file);
        setLastResult(result);
        onParsed?.(result);
      } catch (error) {
        setSelectedFile(null);
        reportError((error as Error).message);
      }
    },
    [onParsed, parseFile, reportError]
  );

  const handleFile = React.useCallback(
    (file: File | undefined) => {
      if (!file || busy) return;
      void uploadFile(file);
    },
    [busy, uploadFile]
  );

  const onDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!busy) setDragActive(true);
  };

  const onDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragActive(false);
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (busy) return;
    handleFile(event.dataTransfer.files?.[0]);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setLastResult(null);
    setLocalError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'border-border bg-muted/20 relative flex min-h-[160px] items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors',
          dragActive && 'border-primary bg-primary/5',
          localError && 'border-destructive',
          busy && 'opacity-70'
        )}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {parseFile.isPending ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-8 text-sm">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            <span>Uploading {selectedFile?.name ?? 'file'}…</span>
          </div>
        ) : lastResult ? (
          <div className="flex w-full flex-col items-center gap-2 px-4 py-8 text-center">
            <FileSpreadsheet className="text-primary size-8" aria-hidden />
            <p className="text-foreground max-w-full truncate text-sm font-medium">
              {selectedFile?.name}
            </p>
            <p className="text-muted-foreground text-xs">
              {lastResult.rowCount.toLocaleString()} rows · {lastResult.headers.length} columns
            </p>
            <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
              Choose another file
            </Button>
          </div>
        ) : (
          <label
            htmlFor={id}
            className={cn(
              'flex min-h-[160px] w-full cursor-pointer flex-col items-center justify-center gap-2 px-4 py-8 text-center',
              busy && 'cursor-not-allowed'
            )}
          >
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <Upload className="size-5" aria-hidden />
            </span>
            <span className="text-foreground text-sm font-medium">Drop CSV or browse</span>
            <span className="text-muted-foreground text-xs">{IMPORT_LIMITS_HINT}</span>
          </label>
        )}

        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={IMPORT_ACCEPT}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      {localError ? <p className="text-destructive text-sm">{localError}</p> : null}

      {properties.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => downloadImportCsvTemplate(properties)}
          >
            Download template
          </Button>
        </div>
      ) : null}
    </div>
  );
}
