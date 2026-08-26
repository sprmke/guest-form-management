import { Check, CircleOff, Sparkles } from 'lucide-react';

import type { TeamMemberStatus } from '@/features/dashboard/team/types/propertyTeam';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { semanticBadgeClasses } from '@/lib/statusToneColors';
import { cn } from '@/lib/utils';

type Props = {
  status: TeamMemberStatus;
  planLimited?: boolean;
};

export function TeamMemberStatusBadge({ status, planLimited = false }: Props) {
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

  if (status === 'inactive' && planLimited) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('border-transparent', semanticBadgeClasses('warning'))}
          >
            <Sparkles className="mr-1 size-3" aria-hidden />
            Plan limit
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Paused when the plan seat limit was reached. Upgrade or free a seat to restore access.
        </TooltipContent>
      </Tooltip>
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
