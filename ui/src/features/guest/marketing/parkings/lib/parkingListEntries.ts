import { mockDevelopments } from '@/features/guest/marketing/developments/data/mockDevelopments';
import { mockParkingSlots } from '@/features/guest/marketing/developments/data/mockParkingSlots';
import type { ParkingSlot } from '@/features/guest/marketing/developments/types';

export interface ParkingListEntry {
  slot: ParkingSlot;
  developmentSlug: string;
  developmentName: string;
  city: string;
  /** Public detail path segment — mock uses slot id until live catalog ships */
  detailSlug: string;
}

const developmentById = new Map(
  mockDevelopments.map((development) => [development.id, development])
);

/** Parking slots enriched with development context for top-level `/parkings` routes. */
export function buildParkingListEntries(): ParkingListEntry[] {
  const entries: ParkingListEntry[] = [];

  for (const slot of mockParkingSlots) {
    const development = developmentById.get(slot.developmentId);
    if (!development) continue;

    entries.push(toParkingListEntry(slot, development));
  }

  return entries;
}

export function toParkingListEntry(
  slot: ParkingSlot,
  development: { slug: string; name: string; city: string }
): ParkingListEntry {
  return {
    slot,
    developmentSlug: development.slug,
    developmentName: development.name,
    city: development.city.trim() || 'Other',
    detailSlug: slot.id,
  };
}

export function parkingListEntriesForSlots(
  slots: ParkingSlot[],
  development: { slug: string; name: string; city: string }
): ParkingListEntry[] {
  return slots.map((slot) => toParkingListEntry(slot, development));
}

export function parkingSlotsFromEntries(entries: ParkingListEntry[]): ParkingSlot[] {
  return entries.map((entry) => entry.slot);
}
