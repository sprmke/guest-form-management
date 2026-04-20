---
name: tanstack-query
description: TanStack Query v5 skill for data fetching, caching, mutations, and state management. Use when implementing queries, mutations, optimistic updates, cache invalidation, or Suspense-based data fetching.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# TanStack Query v5 Skill

This skill helps you implement data fetching with TanStack Query v5 via tRPC.

## Tech Stack Context

- **State Management**: TanStack Query v5 + Zustand
- **API**: tRPC (auto-generates TanStack Query hooks)
- **Framework**: React 19 with Suspense

## Key Changes from v4

- `cacheTime` is now `gcTime`
- First-class Suspense support with `useSuspenseQuery`
- Single object parameter style
- Callbacks removed from useQuery (use mutation callbacks instead)

## Feature-Based API Organization

API hooks are organized **per feature**:

```
src/features/
├── bookings/
│   └── api/
│       ├── use-bookings.ts           # Query hooks
│       └── use-booking-mutations.ts  # Mutation hooks
├── payments/
│   └── api/
│       ├── use-payments.ts
│       └── use-payment-mutations.ts
└── ...
```

## Query Hooks (Feature-Based)

### Basic Query Hook

```typescript
// src/features/bookings/api/use-bookings.ts
import { api } from '@/lib/api/client';
import type { BookingFilters } from '../types';

export function useBookings(filters: BookingFilters) {
  return api.bookings.list.useQuery(filters, {
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!filters.propertyId,
  });
}

export function useBookingById(id: string) {
  return api.bookings.byId.useQuery(
    { id },
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  );
}
```

### Suspense Query (Recommended with React 19)

```typescript
// src/features/bookings/api/use-bookings.ts
export function useBookingsSuspense(filters: BookingFilters) {
  return api.bookings.list.useSuspenseQuery(filters);
}

// Usage in component
import { Suspense } from 'react';
import { useBookingsSuspense } from '../api/use-bookings';

function BookingsListSuspense({ propertyId }: Props) {
  const { data } = useBookingsSuspense({ propertyId });
  return <div>{/* render data */}</div>;
}

// Wrap with Suspense boundary
<Suspense fallback={<LoadingSpinner />}>
  <BookingsListSuspense propertyId={propertyId} />
</Suspense>
```

### Infinite Query (Pagination)

```typescript
// src/features/bookings/api/use-bookings.ts
export function useBookingsInfinite(propertyId: string, limit = 20) {
  return api.bookings.list.useInfiniteQuery(
    { propertyId, limit },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialCursor: 0,
    }
  );
}

// Usage
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useBookingsInfinite(propertyId);

// Flatten pages
const allBookings = data?.pages.flatMap((page) => page.items) ?? [];
```

## Mutation Hooks (Feature-Based)

### Complete Mutation Hook

```typescript
// src/features/bookings/api/use-booking-mutations.ts
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

export function useBookingMutations() {
  const utils = api.useUtils();

  const create = api.bookings.create.useMutation({
    onSuccess: () => {
      toast.success('Booking created');
      utils.bookings.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatus = api.bookings.updateStatus.useMutation({
    onSuccess: (data) => {
      toast.success('Status updated');
      utils.bookings.byId.setData({ id: data.id }, data);
      utils.bookings.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const remove = api.bookings.delete.useMutation({
    onSuccess: () => {
      toast.success('Booking deleted');
      utils.bookings.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return {
    create,
    updateStatus,
    remove,
    isLoading: create.isPending || updateStatus.isPending || remove.isPending,
  };
}
```

### Optimistic Update Pattern

```typescript
// src/features/bookings/api/use-booking-mutations.ts
export function useOptimisticStatusUpdate() {
  const utils = api.useUtils();

  return api.bookings.updateStatus.useMutation({
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await utils.bookings.byId.cancel({ id: newData.id });

      // Snapshot previous value
      const previousBooking = utils.bookings.byId.getData({ id: newData.id });

      // Optimistically update
      utils.bookings.byId.setData({ id: newData.id }, (old) => ({
        ...old!,
        status: newData.status,
      }));

      return { previousBooking };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      if (context?.previousBooking) {
        utils.bookings.byId.setData({ id: newData.id }, context.previousBooking);
      }
      toast.error('Failed to update status');
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      utils.bookings.byId.invalidate({ id: variables.id });
    },
  });
}
```

## Using in Components

```typescript
// src/features/bookings/components/BookingList.tsx
import { useBookings } from '../api/use-bookings';
import { useBookingMutations } from '../api/use-booking-mutations';
import { BookingCard } from './BookingCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

interface BookingListProps {
  propertyId: string;
}

export function BookingList({ propertyId }: BookingListProps) {
  const { data, isLoading, error } = useBookings({ propertyId });
  const { updateStatus } = useBookingMutations();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;
  if (!data?.data.length) return <EmptyState message="No bookings" />;

  return (
    <div className="space-y-4">
      {data.data.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onStatusChange={(status) =>
            updateStatus.mutate({ id: booking.id, status })
          }
          isUpdating={updateStatus.isPending}
        />
      ))}
    </div>
  );
}
```

## Utils API

### Get Query Data

```typescript
const utils = api.useUtils();

// Get cached data
const booking = utils.bookings.byId.getData({ id: bookingId });

// Set cached data
utils.bookings.byId.setData({ id: bookingId }, updatedBooking);

// Prefetch data
await utils.bookings.byId.prefetch({ id: bookingId });

// Invalidate queries
utils.bookings.list.invalidate(); // All lists
utils.bookings.list.invalidate({ propertyId }); // Specific query
utils.bookings.invalidate(); // All booking queries
```

## Query Options

```typescript
export function useBookings(propertyId: string, options?: { enabled?: boolean }) {
  return api.bookings.list.useQuery(
    { propertyId },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      enabled: options?.enabled ?? !!propertyId,
    }
  );
}
```

## Provider Setup

```typescript
// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { api, trpcClient } from '@/lib/api/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute
            gcTime: 1000 * 60 * 5, // 5 minutes
          },
        },
      })
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </api.Provider>
  );
}
```

## File Organization Summary

```
src/
├── features/
│   ├── bookings/
│   │   ├── api/
│   │   │   ├── use-bookings.ts           # useBookings, useBookingById, etc.
│   │   │   └── use-booking-mutations.ts  # useBookingMutations
│   │   ├── components/
│   │   │   └── BookingList.tsx          # Uses feature API hooks
│   │   └── types/
│   │       └── index.ts
│   │
│   └── payments/
│       └── api/
│           ├── use-payments.ts
│           └── use-payment-mutations.ts
│
└── lib/
    └── api/
        └── client.ts                     # Shared tRPC client
```

## Reference Documentation

- See `docs/architecture/project-structure.md` for feature-based architecture
- See `.cursor/rules/02-architecture.mdc` for import rules
