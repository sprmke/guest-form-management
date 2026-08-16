import { useState } from 'react';

import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

import type {
  ChatBlock,
  ConfirmActionResponse,
} from '@/features/dashboard/ai-assistant/lib/aiAssistantApi';

import { Button } from '@/components/ui/button';


type Props = Extract<ChatBlock, { type: 'action_confirmation' }> & {
  onResolve: (actionId: string, confirm: boolean) => Promise<ConfirmActionResponse | null>;
};

export function ActionConfirmationBlock({ actionId, summary, details, status, onResolve }: Props) {
  const [busy, setBusy] = useState<'confirm' | 'deny' | null>(null);

  const handle = async (confirm: boolean) => {
    setBusy(confirm ? 'confirm' : 'deny');
    await onResolve(actionId, confirm);
    setBusy(null);
  };

  return (
    <div className="border-border/60 bg-card space-y-2 rounded-xl border p-3">
      <div className="flex items-start gap-2">
        {status === 'executed' ? (
          <CheckCircle2 className="text-success mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : status === 'denied' || status === 'expired' ? (
          <AlertCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <AlertCircle className="text-warning mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <p className="text-foreground text-sm font-medium">{summary}</p>
      </div>

      {details.length > 0 && (
        <dl className="space-y-0.5 pl-6">
          {details.map((d) => (
            <div key={d.label} className="flex gap-2 text-xs">
              <dt className="text-muted-foreground">{d.label}:</dt>
              <dd className="text-foreground">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {status === 'proposed' && (
        <div className="flex gap-2 pl-6">
          <Button size="sm" onClick={() => void handle(true)} disabled={busy !== null}>
            {busy === 'confirm' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              'Confirm'
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handle(false)}
            disabled={busy !== null}
          >
            {busy === 'deny' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              'Cancel'
            )}
          </Button>
        </div>
      )}

      {status === 'executed' && (
        <p className="text-success pl-6 text-xs font-medium">Done automatically.</p>
      )}
      {status === 'denied' && (
        <p className="text-muted-foreground pl-6 text-xs">Cancelled — no changes made.</p>
      )}
      {status === 'expired' && (
        <p className="text-muted-foreground pl-6 text-xs">This action expired.</p>
      )}
    </div>
  );
}
