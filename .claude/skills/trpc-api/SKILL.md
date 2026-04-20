---
name: trpc-api
description: tRPC API skill for creating type-safe API routes, procedures, routers, and middleware. Use when building API endpoints, handling mutations, queries, or working with the tRPC stack.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# tRPC API Skill

This skill helps you build type-safe APIs with tRPC.

## Tech Stack Context

- **Framework**: Next.js 16 App Router
- **API**: tRPC with TanStack Query v5
- **Validation**: Zod
- **Auth**: Auth.js

## File Locations

### Server-Side (Centralized)

- Routers: `src/server/routers/`
- Root router: `src/server/routers/_app.ts`
- Services: `src/server/services/`
- tRPC context: `src/server/trpc/context.ts`
- tRPC init: `src/server/trpc/init.ts`

### Client-Side (Feature-Based)

- Feature API hooks: `src/features/{feature}/api/`
  - `use-{feature}.ts` - Query hooks
  - `use-{feature}-mutations.ts` - Mutation hooks
- Shared tRPC client: `src/lib/api/client.ts`

## Router Structure

### Basic Router (Server-Side)

```typescript
// src/server/routers/bookings.ts
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc/init';
import { TRPCError } from '@trpc/server';
import { bookingService } from '../services/booking.service';

export const bookingsRouter = router({
  // Query - fetch data
  list: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED']).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return bookingService.getBookings(ctx.user.id, input);
    }),

  // Query by ID
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const booking = await bookingService.getById(input.id);
      if (!booking) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
      }
      return booking;
    }),

  // Mutation - create
  create: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        guestName: z.string().min(2).max(100),
        guestEmail: z.string().email(),
        checkInDate: z.date(),
        checkOutDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.checkOutDate <= input.checkInDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Check-out date must be after check-in date',
        });
      }
      return bookingService.create(ctx.user.id, input);
    }),

  // Mutation - update
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return bookingService.updateStatus(ctx.user.id, input.id, input.status);
    }),

  // Mutation - delete (soft)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return bookingService.softDelete(ctx.user.id, input.id);
    }),
});
```

### Root Router

```typescript
// src/server/routers/_app.ts
import { router } from '../trpc/init';
import { bookingsRouter } from './bookings';
import { propertiesRouter } from './properties';
import { organizationsRouter } from './organizations';

export const appRouter = router({
  bookings: bookingsRouter,
  properties: propertiesRouter,
  organizations: organizationsRouter,
});

export type AppRouter = typeof appRouter;
```

## Feature API Hooks (Client-Side)

### Query Hooks

```typescript
// src/features/bookings/api/use-bookings.ts
import { api } from '@/lib/api/client';
import type { BookingFilters } from '../types';

export function useBookings(filters: BookingFilters) {
  return api.bookings.list.useQuery(filters, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useBookingById(id: string) {
  return api.bookings.byId.useQuery({ id }, { enabled: !!id });
}

// Suspense query (for React 19 Suspense)
export function useBookingsSuspense(filters: BookingFilters) {
  return api.bookings.list.useSuspenseQuery(filters);
}
```

### Mutation Hooks

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

  return { create, updateStatus, remove };
}
```

## Using in Components

```typescript
// src/features/bookings/components/BookingList.tsx
import { useBookings } from '../api/use-bookings';
import { useBookingMutations } from '../api/use-booking-mutations';
import { BookingCard } from './BookingCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface BookingListProps {
  propertyId: string;
}

export function BookingList({ propertyId }: BookingListProps) {
  const { data, isLoading, error } = useBookings({ propertyId });
  const { updateStatus } = useBookingMutations();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      {data?.data.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onStatusChange={(status) =>
            updateStatus.mutate({ id: booking.id, status })
          }
        />
      ))}
    </div>
  );
}
```

## Procedure Types

### Public Procedure

```typescript
// No auth required
publicProcedure.query(async () => {
  return { status: 'ok' };
});
```

### Protected Procedure

```typescript
// Auth required - ctx.user is available
protectedProcedure.query(async ({ ctx }) => {
  return { userId: ctx.user.id };
});
```

### Custom Middleware

```typescript
const withOrganization = protectedProcedure.use(async ({ ctx, next }) => {
  const orgId = ctx.headers.get('x-organization-id');
  if (!orgId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization required' });
  }
  return next({
    ctx: { ...ctx, organizationId: orgId },
  });
});
```

## Input Validation with Zod

### Common Schemas

```typescript
// src/lib/validations/common.ts
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

// Combine schemas
.input(paginationSchema.merge(z.object({
  propertyId: z.string().uuid(),
})))
```

## Error Handling

### TRPCError Codes

```typescript
throw new TRPCError({
  code: 'NOT_FOUND', // 404
  code: 'BAD_REQUEST', // 400
  code: 'UNAUTHORIZED', // 401
  code: 'FORBIDDEN', // 403
  code: 'CONFLICT', // 409
  code: 'INTERNAL_SERVER_ERROR', // 500
  message: 'Human-readable error message',
});
```

## Permission Checking Pattern

```typescript
// In procedure
.mutation(async ({ ctx, input }) => {
  await checkPermission(ctx.user.id, 'bookings:create', input.propertyId);
  // ... rest of logic
})
```

## File Organization Summary

```
src/
├── server/                    # Server-side (centralized)
│   ├── routers/
│   │   ├── _app.ts           # Root router
│   │   ├── bookings.ts       # Booking router
│   │   └── ...
│   └── services/
│       ├── booking.service.ts
│       └── ...
│
├── features/                  # Client-side (feature-based)
│   └── bookings/
│       ├── api/
│       │   ├── use-bookings.ts         # Query hooks
│       │   └── use-booking-mutations.ts # Mutation hooks
│       ├── components/
│       │   └── BookingList.tsx
│       └── types/
│           └── index.ts
│
└── lib/
    └── api/
        └── client.ts         # Shared tRPC client
```

## Reference Documentation

- See `docs/architecture/project-structure.md` for feature-based architecture
- See `docs/reference/feature-specifications.md` for API specs
- See `.cursor/rules/02-architecture.mdc` for import rules
