import { Check, CircleOff } from 'lucide-react';

import type { TeamMemberStatus } from '@/features/dashboard/team/types/propertyTeam';
import { semanticBadgeClasses } from '@/lib/status-tone-colors';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Props = {
  status: TeamMemberStatus;
};

export function TeamMemberStatusBadge({ status }: Props) {
  if (status === 'active') {
    return (
      <Badge
        variant="outline"
        className={cn('border-transparent', semanticBadgeClasses('success'))}
      >
        <Check className="mr-1 size-3" aria-hidden />
        Active
      </Badge>
    );
  }

  if (status === 'inactive') {
    return (
      <Badge
        variant="outline"
        className={cn('border-transparent', semanticBadgeClasses('neutral'))}
      >
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
