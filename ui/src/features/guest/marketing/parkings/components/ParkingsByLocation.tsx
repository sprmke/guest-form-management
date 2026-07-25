import { Car } from 'lucide-react';

import { ParkingsLocationRow } from './ParkingsLocationRow';
import { groupParkingsByLocation } from '../lib/groupParkingsByLocation';

import type { ParkingListEntry } from '../lib/parkingListEntries';

interface ParkingsByLocationProps {
  entries: ParkingListEntry[];
}

export function ParkingsByLocation({ entries }: ParkingsByLocationProps) {
  const groups = groupParkingsByLocation(entries);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="bg-muted mb-4 rounded-full p-5">
          <Car className="text-muted-foreground h-8 w-8" />
        </div>
        <h3 className="text-foreground text-lg font-semibold">No parking found</h3>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-10 sm:space-y-12">
      {groups.map((group) => (
        <ParkingsLocationRow
          key={group.city}
          title={group.title}
          viewAllTo={`/parkings/in/${group.locationSlug}`}
          entries={group.entries}
        />
      ))}
    </div>
  );
}
