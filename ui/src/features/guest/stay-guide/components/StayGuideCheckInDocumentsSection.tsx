import { CheckCircle2, Clock3, ExternalLink, FileCheck, FileText } from 'lucide-react';

import type { StayGuideCheckInDocumentDto } from '@/features/guest/stay-guide/lib/api';

import { cn } from '@/lib/utils';

type Props = {
  documents: StayGuideCheckInDocumentDto[];
};

export function StayGuideCheckInDocumentsSection({ documents }: Props) {
  if (documents.length === 0) return null;

  const readyCount = documents.filter((doc) => doc.status === 'ready').length;
  const allReady = readyCount === documents.length;

  return (
    <section
      id="check-in-documents"
      className="scroll-mt-24 px-4 py-2 sm:scroll-mt-28 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[720px]">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
            <FileCheck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-primary text-[11px] font-bold uppercase tracking-[0.2em]">Arrival</p>
            <h2 className="font-fraunces text-2xl font-semibold tracking-tight text-[#171717] sm:text-3xl dark:text-[#FAFAFA]">
              Check-in documents
            </h2>
          </div>
        </div>

        <div
          className={cn(
            'overflow-hidden rounded-3xl border p-4 sm:p-5',
            allReady
              ? 'border-emerald-500/25 bg-emerald-500/[0.04] dark:border-emerald-400/20 dark:bg-emerald-400/[0.06]'
              : 'border-[#171717]/10 bg-[#FAFAFA] dark:border-[#FAFAFA]/10 dark:bg-[#141414]'
          )}
        >
          <ul className="space-y-2.5">
            {documents.map((doc) => (
              <li key={doc.id}>
                <CheckInDocumentRow document={doc} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CheckInDocumentRow({ document: doc }: { document: StayGuideCheckInDocumentDto }) {
  const isReady = doc.status === 'ready';
  const canOpen = isReady && Boolean(doc.url?.trim()) && !doc.isPreviewSample;

  return (
    <div
      className={cn(
        'flex min-h-[56px] items-center gap-3 rounded-2xl border px-3.5 py-3 sm:px-4',
        isReady
          ? 'border-emerald-500/20 bg-white dark:border-emerald-400/15 dark:bg-[#0A0A0A]'
          : 'border-[#171717]/12 dark:border-[#FAFAFA]/12 border-dashed bg-white/70 dark:bg-[#0A0A0A]/60'
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          isReady
            ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
            : 'bg-[#171717]/06 dark:bg-[#FAFAFA]/08 text-[#737373] dark:text-[#A3A3A3]'
        )}
        aria-hidden
      >
        {isReady ? <FileText className="size-4" /> : <Clock3 className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#171717] dark:text-[#FAFAFA]">
          {doc.label}
        </p>
        <p
          className={cn(
            'mt-0.5 flex items-center gap-1 text-xs font-medium',
            isReady
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-[#737373] dark:text-[#A3A3A3]'
          )}
        >
          {isReady ? (
            <>
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              Ready
            </>
          ) : (
            'Pending'
          )}
        </p>
      </div>

      {canOpen ? (
        <a
          href={doc.url!}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'bg-primary text-primary-foreground inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold',
            'focus-visible:ring-primary/40 focus-visible:outline-none focus-visible:ring-2'
          )}
        >
          Open
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      ) : isReady && doc.isPreviewSample ? (
        <span className="bg-primary/15 text-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold">
          Open
          <ExternalLink className="size-3.5" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}
