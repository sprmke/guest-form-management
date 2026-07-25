import { Check, CircleOff } from 'lucide-react';

import type { TeamMemberStatus } from '@/features/dashboard/team/types/propertyTeam';

import { Badge } from '@/components/ui/badge';

type Props = {
  status: TeamMemberStatus;
};

export function TeamMemberStatusBadge({ status }: Props) {
  if (status === 'active') {
    return (
      <Badge
        variant="outline"
        className="border-green-600 text-green-600 dark:border-green-500 dark:text-green-400"
      >
        <Check className="mr-1 size-3" aria-hidden />
        Active
      </Badge>
    );
  }

  if (status === 'inactive') {
    return (
      <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">
        <CircleOff className="mr-1 size-3" aria-hidden />
        Disabled
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="capitalize">
      {status}
    </Badge>
  );
}
