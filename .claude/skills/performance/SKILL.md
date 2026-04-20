---
name: performance
description: Performance optimization skill for building fast, efficient applications. Use when optimizing React components, database queries, bundle size, caching strategies, and overall application performance.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Performance Optimization Skill

This skill helps you build fast, efficient, production-ready applications.

## Tech Stack Context

- **Framework**: Next.js 16 with App Router
- **React**: React 19 with Server Components
- **Database**: PostgreSQL on Neon with Drizzle ORM
- **Caching**: TanStack Query + Next.js caching
- **Bundler**: Turbopack

## Core Performance Principles

### 1. Server-First Architecture

- Default to Server Components
- Move data fetching to the server
- Minimize client-side JavaScript
- Use streaming and Suspense

### 2. Smart Data Loading

- Fetch only what you need
- Use proper pagination
- Implement caching strategies
- Avoid N+1 queries

### 3. Optimistic Updates

- Update UI immediately
- Handle errors gracefully
- Sync with server in background

## React Performance

### Server Components (Default)

```tsx
// ✅ Server Component - no "use client"
// Data fetched on server, zero JS sent to client
export async function PropertyList({ orgId }: { orgId: string }) {
  const properties = await db.query.properties.findMany({
    where: eq(properties.organizationId, orgId),
    columns: {
      id: true,
      name: true,
      city: true,
      basePrice: true,
      // Only select needed columns
    },
    limit: 20,
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      {properties.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}
```

### Client Component Optimization

```tsx
'use client';

import { memo, useMemo, useCallback, useState, useTransition } from 'react';

// ✅ Memoize expensive components
export const PropertyCard = memo(function PropertyCard({ property, onSelect }: PropertyCardProps) {
  // ✅ Memoize callbacks passed to children
  const handleClick = useCallback(() => {
    onSelect(property.id);
  }, [property.id, onSelect]);

  // ✅ Memoize expensive calculations
  const formattedPrice = useMemo(() => formatCurrency(property.basePrice), [property.basePrice]);

  return (
    <Card onClick={handleClick}>
      <CardTitle>{property.name}</CardTitle>
      <span>{formattedPrice}</span>
    </Card>
  );
});

// ✅ Use transitions for non-urgent updates
function SearchableList() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    // Urgent: update input immediately
    setQuery(value);

    // Non-urgent: filter list in transition
    startTransition(() => {
      setFilteredItems(filterItems(value));
    });
  };

  return (
    <>
      <Input value={query} onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <List items={filteredItems} />
    </>
  );
}
```

### Avoid Common Anti-Patterns

```tsx
// ❌ BAD: Creating objects in render
function Component() {
  return <Child style={{ color: 'red' }} />; // New object every render
}

// ✅ GOOD: Stable references
const styles = { color: 'red' };
function Component() {
  return <Child style={styles} />;
}

// ❌ BAD: Inline function in render
function Component() {
  return <Child onClick={() => doSomething()} />; // New function every render
}

// ✅ GOOD: useCallback
function Component() {
  const handleClick = useCallback(() => doSomething(), []);
  return <Child onClick={handleClick} />;
}

// ❌ BAD: Fetching in useEffect
function Component() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/data').then(setData);
  }, []);
}

// ✅ GOOD: Use TanStack Query
function Component() {
  const { data } = api.data.list.useQuery();
}
```

## Data Loading Optimization

### Parallel Data Fetching

```tsx
// ✅ Parallel fetching with Promise.all
export async function DashboardPage() {
  const [stats, recentBookings, upcomingEvents] = await Promise.all([
    getStats(),
    getRecentBookings(),
    getUpcomingEvents(),
  ]);

  return (
    <>
      <StatsCards stats={stats} />
      <RecentBookings bookings={recentBookings} />
      <Calendar events={upcomingEvents} />
    </>
  );
}

// ✅ Independent Suspense boundaries for streaming
export async function DashboardPage() {
  return (
    <>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsCards />
      </Suspense>
      <Suspense fallback={<BookingsSkeleton />}>
        <RecentBookings />
      </Suspense>
      <Suspense fallback={<CalendarSkeleton />}>
        <Calendar />
      </Suspense>
    </>
  );
}
```

### Pagination & Infinite Scroll

```tsx
// ✅ Cursor-based pagination (better for large datasets)
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = api.bookings.list.useInfiniteQuery(
  { propertyId, limit: 20 },
  {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  }
);

// Flatten pages
const bookings = data?.pages.flatMap((page) => page.items) ?? [];

// Infinite scroll trigger
<InView
  onChange={(inView) => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }}
>
  {isFetchingNextPage && <LoadingSpinner />}
</InView>;
```

### Prefetching

```tsx
// ✅ Prefetch on hover
export function PropertyLink({ property }: { property: Property }) {
  const utils = api.useUtils();

  const handleMouseEnter = () => {
    // Prefetch property details before user clicks
    utils.properties.byId.prefetch({ id: property.id });
  };

  return (
    <Link href={`/properties/${property.id}`} onMouseEnter={handleMouseEnter}>
      {property.name}
    </Link>
  );
}

// ✅ Prefetch in Server Component
export async function PropertiesPage() {
  // Prefetch first property details
  const properties = await db.query.properties.findMany({ limit: 10 });

  return (
    <>
      {properties.map((p) => (
        <Link
          key={p.id}
          href={`/properties/${p.id}`}
          prefetch={true} // Next.js will prefetch
        >
          {p.name}
        </Link>
      ))}
    </>
  );
}
```

## Database Optimization

### Efficient Queries

```typescript
// ❌ BAD: N+1 query
const bookings = await db.query.bookings.findMany();
for (const booking of bookings) {
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, booking.propertyId),
  });
  // Use property...
}

// ✅ GOOD: Single query with relations
const bookings = await db.query.bookings.findMany({
  with: {
    property: {
      columns: { id: true, name: true, city: true },
    },
  },
});

// ✅ GOOD: Select only needed columns
const properties = await db.query.properties.findMany({
  columns: {
    id: true,
    name: true,
    basePrice: true,
    // Don't select large text fields if not needed
  },
});

// ✅ GOOD: Indexed queries
const bookings = await db.query.bookings.findMany({
  where: and(
    eq(bookings.propertyId, propertyId), // Indexed
    eq(bookings.status, 'CONFIRMED'), // Indexed
    gte(bookings.checkInDate, startDate)
  ),
  orderBy: [desc(bookings.createdAt)], // Indexed
  limit: 20,
});
```

### Database Indexes

```typescript
// In schema file - add indexes for frequently queried columns
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id),
    status: bookingStatusEnum('status').notNull(),
    checkInDate: date('check_in_date').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Composite index for common queries
    propertyStatusIdx: index('booking_property_status_idx').on(table.propertyId, table.status),

    // Index for date range queries
    checkInIdx: index('booking_checkin_idx').on(table.checkInDate),

    // Index for sorting
    createdAtIdx: index('booking_created_idx').on(table.createdAt),
  })
);
```

### Connection Pooling

```typescript
// lib/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Use pooled connection string for serverless
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, {
  // Enable logging only in development
  logger: process.env.NODE_ENV === 'development',
});
```

## Caching Strategies

### TanStack Query Caching

```typescript
// Configure default cache times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache retained
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 3,
    },
  },
});

// Per-query configuration
const { data } = api.properties.list.useQuery(
  { organizationId },
  {
    staleTime: 1000 * 60 * 10, // Properties change infrequently
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  }
);

// Real-time data - shorter cache
const { data } = api.bookings.list.useQuery(
  { propertyId },
  {
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  }
);
```

### Next.js Cache

```typescript
// Route segment caching
export const revalidate = 3600; // Revalidate every hour

// Fetch with cache
async function getProperties() {
  return fetch('/api/properties', {
    next: { revalidate: 3600 },
  });
}

// On-demand revalidation
import { revalidatePath, revalidateTag } from 'next/cache';

export async function updateProperty(id: string, data: PropertyData) {
  await db.update(properties).set(data).where(eq(properties.id, id));

  // Revalidate cached pages
  revalidatePath('/properties');
  revalidatePath(`/properties/${id}`);
}
```

## Image Optimization

### Next.js Image Component

```tsx
import Image from 'next/image';

// ✅ Optimized image loading
<Image
  src={property.imageUrl}
  alt={property.name}
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL={property.blurHash}
  loading="lazy" // Below fold
  priority={index === 0} // First image loads immediately
/>

// ✅ Responsive images
<Image
  src={property.imageUrl}
  alt={property.name}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

### CloudFront Image Optimization

```typescript
// Generate optimized image URLs
function getOptimizedImageUrl(
  key: string,
  options: { width?: number; height?: number; quality?: number }
) {
  const { width = 800, height, quality = 80 } = options;
  const params = new URLSearchParams({
    w: width.toString(),
    q: quality.toString(),
    ...(height && { h: height.toString() }),
  });

  return `https://${CLOUDFRONT_DOMAIN}/${key}?${params}`;
}

// Usage in component
<img
  src={getOptimizedImageUrl(property.imageKey, { width: 400, quality: 85 })}
  srcSet={`
    ${getOptimizedImageUrl(property.imageKey, { width: 400 })} 400w,
    ${getOptimizedImageUrl(property.imageKey, { width: 800 })} 800w,
    ${getOptimizedImageUrl(property.imageKey, { width: 1200 })} 1200w
  `}
  sizes="(max-width: 768px) 100vw, 33vw"
/>
```

## Bundle Optimization

### Code Splitting

```tsx
// ✅ Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/rich-text-editor'), {
  loading: () => <Skeleton className="h-[200px]" />,
  ssr: false, // Client-only component
});

const ChartComponent = dynamic(() => import('@/components/charts/revenue-chart'), {
  loading: () => <Skeleton className="h-[300px]" />,
});

// ✅ Route-based splitting (automatic with App Router)
// Each route is automatically code-split
```

### Reduce Bundle Size

```typescript
// ✅ Import only what you need
import { format, formatDistanceToNow } from 'date-fns';
// Not: import * as dateFns from 'date-fns';

// ✅ Use tree-shakeable exports
import { Button } from '@/components/ui/button';
// Not: import { Button } from '@/components/ui';

// ✅ Analyze bundle
// bun run analyze
```

### Lazy Loading Routes

```tsx
// Parallel route loading
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

## Performance Monitoring

### Web Vitals

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
```

### Custom Performance Metrics

```typescript
// lib/performance.ts
export function measureQueryTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    if (duration > 100) {
      console.warn(`Slow query: ${name} took ${duration.toFixed(2)}ms`);
    }
  });
}

// Usage
const bookings = await measureQueryTime('bookings.list', () =>
  db.query.bookings.findMany({ where: eq(bookings.propertyId, propertyId) })
);
```

## Performance Checklist

### Before Production

- [ ] All images use Next.js Image or optimized URLs
- [ ] Proper indexes on frequently queried columns
- [ ] No N+1 queries
- [ ] Code splitting for large components
- [ ] Proper cache headers set
- [ ] Bundle analyzed and optimized
- [ ] Web Vitals monitoring enabled
- [ ] Error boundaries implemented

### Target Metrics

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 600ms

## Reference Documentation

- See `.cursorrules` for optimization patterns
- See `docs/architecture/tech-stack.md` for caching setup
- Next.js Performance: https://nextjs.org/docs/app/building-your-application/optimizing
