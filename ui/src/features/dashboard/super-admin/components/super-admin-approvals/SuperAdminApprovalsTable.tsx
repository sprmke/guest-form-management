import { ClipboardCheck } from 'lucide-react';

export function SuperAdminApprovalsTable() {
  return (
    <div className="surface-card flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <ClipboardCheck className="text-muted-foreground size-10" aria-hidden />
      <p className="text-foreground text-sm font-medium">No approvals yet</p>
    </div>
  );
}
