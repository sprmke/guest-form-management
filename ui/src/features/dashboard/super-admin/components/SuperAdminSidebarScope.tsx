import { Shield } from 'lucide-react';

import { cn } from '@/lib/utils';

type SuperAdminSidebarScopeProps = {
  collapsed?: boolean;
};

export function SuperAdminSidebarScope({ collapsed = false }: SuperAdminSidebarScopeProps) {
  const scopeIcon = (
    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
      <Shield className="h-5 w-5" aria-hidden />
    </div>
  );

  if (collapsed) {
    return <div className="flex w-full justify-center">{scopeIcon}</div>;
  }

  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2 py-2',
        'text-sidebar-foreground'
      )}
    >
      {scopeIcon}
      <div className="flex min-w-0 flex-col items-start text-left">
        <span className="text-sidebar-foreground w-full truncate text-sm font-semibold">
          Kame Homes
        </span>
        <span className="text-sidebar-muted w-full truncate text-xs">Super Admin</span>
      </div>
    </div>
  );
}
