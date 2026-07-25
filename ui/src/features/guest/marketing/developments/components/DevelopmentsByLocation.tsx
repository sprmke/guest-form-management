import { Building2 } from 'lucide-react';

import { DevelopmentsLocationRow } from './DevelopmentsLocationRow';
import { groupDevelopmentsByLocation } from '../lib/groupDevelopmentsByLocation';

import type { Development } from '../types';

interface DevelopmentsByLocationProps {
  developments: Development[];
}

export function DevelopmentsByLocation({ developments }: DevelopmentsByLocationProps) {
  const groups = groupDevelopmentsByLocation(developments);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="bg-muted mb-4 rounded-full p-5">
          <Building2 className="text-muted-foreground h-8 w-8" />
        </div>
        <h3 className="text-foreground text-lg font-semibold">No developments found</h3>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-10 sm:space-y-12">
      {groups.map((group) => (
        <DevelopmentsLocationRow
          key={group.city}
          title={group.title}
          viewAllTo={`/developments/in/${group.locationSlug}`}
          developments={group.developments}
        />
      ))}
    </div>
  );
}
