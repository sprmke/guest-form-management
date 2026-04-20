---
name: testing
description: Testing skill for writing unit tests, integration tests, and E2E tests. Use when implementing tests for components, hooks, API routes, and full user flows.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Testing Skill

This skill helps you write comprehensive tests for production-ready applications.

## Tech Stack Context

- **Test Runner**: Bun test (unit/integration)
- **E2E Testing**: Playwright
- **Component Testing**: React Testing Library
- **Mocking**: Built-in Bun mocks

## Test File Locations

- Unit tests: `__tests__/` folder next to source files
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

## Running Tests

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Run specific file
bun test path/to/file.test.ts

# E2E tests
bun run test:e2e
```

## Unit Testing Patterns

### Testing Utilities

```typescript
// __tests__/utils/format-currency.test.ts
import { describe, test, expect } from 'bun:test';
import { formatCurrency, formatPhilippinePeso } from '../format-currency';

describe('formatCurrency', () => {
  test('formats number with default options', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
  });

  test('handles negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  test('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  test('handles decimals', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });
});

describe('formatPhilippinePeso', () => {
  test('formats with PHP symbol', () => {
    expect(formatPhilippinePeso(50000)).toBe('₱50,000.00');
  });
});
```

### Testing Zod Schemas

```typescript
// __tests__/schemas/booking.test.ts
import { describe, test, expect } from 'bun:test';
import { createBookingSchema } from '../booking';

describe('createBookingSchema', () => {
  const validData = {
    propertyId: '123e4567-e89b-12d3-a456-426614174000',
    guestName: 'John Doe',
    guestEmail: 'john@example.com',
    checkInDate: new Date('2024-03-01'),
    checkOutDate: new Date('2024-03-05'),
  };

  test('accepts valid booking data', () => {
    const result = createBookingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('rejects invalid email', () => {
    const result = createBookingSchema.safeParse({
      ...validData,
      guestEmail: 'invalid-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('guestEmail');
    }
  });

  test('rejects checkout before checkin', () => {
    const result = createBookingSchema.safeParse({
      ...validData,
      checkInDate: new Date('2024-03-05'),
      checkOutDate: new Date('2024-03-01'),
    });
    expect(result.success).toBe(false);
  });

  test('rejects short guest name', () => {
    const result = createBookingSchema.safeParse({
      ...validData,
      guestName: 'J',
    });
    expect(result.success).toBe(false);
  });
});
```

### Testing Services

```typescript
// __tests__/services/booking.service.test.ts
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { bookingService } from '../booking.service';
import { db } from '@/lib/db';
import { TRPCError } from '@trpc/server';

// Mock the database
mock.module('@/lib/db', () => ({
  db: {
    query: {
      bookings: {
        findMany: mock(() => []),
        findFirst: mock(() => null),
      },
    },
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => [{ id: '1', status: 'PENDING_REVIEW' }]),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() => [{ id: '1', status: 'CONFIRMED' }]),
        })),
      })),
    })),
  },
}));

describe('bookingService', () => {
  describe('create', () => {
    test('creates booking with PENDING_REVIEW status', async () => {
      const result = await bookingService.create('user-1', {
        propertyId: 'prop-1',
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        checkInDate: new Date('2024-03-01'),
        checkOutDate: new Date('2024-03-05'),
      });

      expect(result.status).toBe('PENDING_REVIEW');
    });
  });

  describe('updateStatus', () => {
    test('throws error for invalid transition', async () => {
      // Mock finding a completed booking
      db.query.bookings.findFirst = mock(() => ({
        id: '1',
        status: 'COMPLETED',
        propertyId: 'prop-1',
      }));

      await expect(bookingService.updateStatus('user-1', '1', 'CONFIRMED')).rejects.toThrow(
        TRPCError
      );
    });
  });
});
```

## React Component Testing

### Testing Components

```typescript
// __tests__/components/property-card.test.tsx
import { describe, test, expect } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { PropertyCard } from '../property-card';

const mockProperty = {
  id: '1',
  name: 'Beach Villa',
  city: 'Manila',
  bedroomCount: 3,
  bathroomCount: 2,
  basePrice: 5000,
  status: 'ACTIVE',
  imageUrl: '/images/villa.jpg',
};

describe('PropertyCard', () => {
  test('renders property name', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Beach Villa')).toBeInTheDocument();
  });

  test('displays bedroom and bathroom count', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('3 beds')).toBeInTheDocument();
    expect(screen.getByText('2 baths')).toBeInTheDocument();
  });

  test('formats price correctly', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('₱5,000')).toBeInTheDocument();
    expect(screen.getByText('/night')).toBeInTheDocument();
  });

  test('shows status badge', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });
});
```

### Testing Forms

```typescript
// __tests__/components/booking-form.test.tsx
import { describe, test, expect, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingForm } from '../booking-form';

// Mock tRPC
const mockMutateAsync = mock(() => Promise.resolve({ id: '1' }));

mock.module('@/lib/api/client', () => ({
  api: {
    bookings: {
      create: {
        useMutation: () => ({
          mutateAsync: mockMutateAsync,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      bookings: {
        list: { invalidate: mock() },
      },
    }),
  },
}));

describe('BookingForm', () => {
  const user = userEvent.setup();

  test('submits form with valid data', async () => {
    const onSuccess = mock();
    render(<BookingForm propertyId="prop-1" onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/guest name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  test('shows validation errors for empty required fields', async () => {
    render(<BookingForm propertyId="prop-1" />);

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  test('shows error for invalid email', async () => {
    render(<BookingForm propertyId="prop-1" />);

    await user.type(screen.getByLabelText(/guest name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Hooks

```typescript
// __tests__/hooks/use-bookings.test.ts
import { describe, test, expect, mock } from 'bun:test';
import { renderHook, waitFor } from '@testing-library/react';
import { useBookings } from '../use-bookings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockBookings = [
  { id: '1', guestName: 'John', status: 'CONFIRMED' },
  { id: '2', guestName: 'Jane', status: 'PENDING_REVIEW' },
];

mock.module('@/lib/api/client', () => ({
  api: {
    bookings: {
      list: {
        useQuery: () => ({
          data: { items: mockBookings, total: 2 },
          isLoading: false,
          error: null,
        }),
      },
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useBookings', () => {
  test('returns bookings list', () => {
    const { result } = renderHook(() => useBookings('prop-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.bookings).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.isLoading).toBe(false);
  });

  test('filters by status', () => {
    const { result } = renderHook(
      () => useBookings('prop-1', { status: 'CONFIRMED' }),
      { wrapper: createWrapper() }
    );

    // Assert filter was passed (check mock call)
    expect(result.current.bookings).toBeDefined();
  });
});
```

## Integration Testing

### API Route Testing

```typescript
// tests/integration/bookings-api.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createCaller } from '@/server/routers';
import { createTestContext } from '../helpers/test-context';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/test-db';

describe('Bookings API', () => {
  let caller: ReturnType<typeof createCaller>;
  let testPropertyId: string;

  beforeAll(async () => {
    await setupTestDatabase();
    const ctx = await createTestContext({ userId: 'test-user-1' });
    caller = createCaller(ctx);

    // Create test property
    const property = await caller.properties.create({
      name: 'Test Property',
      // ... other fields
    });
    testPropertyId = property.id;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  test('creates booking successfully', async () => {
    const booking = await caller.bookings.create({
      propertyId: testPropertyId,
      guestName: 'Test Guest',
      guestEmail: 'test@example.com',
      checkInDate: new Date('2024-03-01'),
      checkOutDate: new Date('2024-03-05'),
    });

    expect(booking.id).toBeDefined();
    expect(booking.status).toBe('PENDING_REVIEW');
    expect(booking.guestName).toBe('Test Guest');
  });

  test('lists bookings for property', async () => {
    const result = await caller.bookings.list({
      propertyId: testPropertyId,
    });

    expect(result.items.length).toBeGreaterThan(0);
  });

  test('updates booking status', async () => {
    const bookings = await caller.bookings.list({ propertyId: testPropertyId });
    const booking = bookings.items[0];

    const updated = await caller.bookings.updateStatus({
      id: booking.id,
      status: 'CONFIRMED',
    });

    expect(updated.status).toBe('CONFIRMED');
  });

  test('throws error for unauthorized access', async () => {
    const otherUserCtx = await createTestContext({ userId: 'other-user' });
    const otherCaller = createCaller(otherUserCtx);

    await expect(otherCaller.bookings.list({ propertyId: testPropertyId })).rejects.toThrow(
      'FORBIDDEN'
    );
  });
});
```

## E2E Testing with Playwright

### Page Object Model

```typescript
// tests/e2e/pages/bookings.page.ts
import { Page, Locator, expect } from '@playwright/test';

export class BookingsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly bookingCards: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Bookings' });
    this.createButton = page.getByRole('button', { name: /create booking/i });
    this.bookingCards = page.locator('[data-testid="booking-card"]');
    this.searchInput = page.getByPlaceholder(/search/i);
    this.statusFilter = page.getByRole('combobox', { name: /status/i });
  }

  async goto() {
    await this.page.goto('/dashboard/bookings');
    await expect(this.heading).toBeVisible();
  }

  async createBooking(data: {
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
  }) {
    await this.createButton.click();

    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/guest name/i).fill(data.guestName);
    await dialog.getByLabel(/email/i).fill(data.guestEmail);
    await dialog.getByLabel(/check-in/i).fill(data.checkIn);
    await dialog.getByLabel(/check-out/i).fill(data.checkOut);

    await dialog.getByRole('button', { name: /create/i }).click();
    await expect(dialog).not.toBeVisible();
  }

  async searchBookings(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForResponse((res) => res.url().includes('/api/trpc/bookings.list'));
  }

  async filterByStatus(status: string) {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
    await this.page.waitForResponse((res) => res.url().includes('/api/trpc/bookings.list'));
  }

  async getBookingCount(): Promise<number> {
    return this.bookingCards.count();
  }
}
```

### E2E Test

```typescript
// tests/e2e/bookings.spec.ts
import { test, expect } from '@playwright/test';
import { BookingsPage } from './pages/bookings.page';

test.describe('Bookings', () => {
  let bookingsPage: BookingsPage;

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/dashboard');

    bookingsPage = new BookingsPage(page);
    await bookingsPage.goto();
  });

  test('displays bookings list', async () => {
    await expect(bookingsPage.heading).toBeVisible();
    const count = await bookingsPage.getBookingCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('creates new booking', async () => {
    const initialCount = await bookingsPage.getBookingCount();

    await bookingsPage.createBooking({
      guestName: 'E2E Test Guest',
      guestEmail: 'e2e@test.com',
      checkIn: '2024-04-01',
      checkOut: '2024-04-05',
    });

    // Verify toast
    await expect(bookingsPage.page.getByText(/created successfully/i)).toBeVisible();

    // Verify list updated
    const newCount = await bookingsPage.getBookingCount();
    expect(newCount).toBe(initialCount + 1);
  });

  test('filters bookings by status', async () => {
    await bookingsPage.filterByStatus('Confirmed');

    const cards = bookingsPage.bookingCards;
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).getByText('CONFIRMED')).toBeVisible();
    }
  });

  test('searches bookings', async () => {
    await bookingsPage.searchBookings('John');

    const cards = bookingsPage.bookingCards;
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toContainText(/john/i);
    }
  });
});
```

## Test Helpers

### Test Context Factory

```typescript
// tests/helpers/test-context.ts
import { auth } from '@/lib/auth/config';

export async function createTestContext(options: {
  userId: string;
  orgId?: string;
  role?: string;
}) {
  return {
    user: {
      id: options.userId,
      currentOrgId: options.orgId ?? 'test-org-1',
      role: options.role ?? 'OWNER',
    },
    session: await auth(),
    headers: new Headers(),
  };
}
```

### Database Test Utilities

```typescript
// tests/helpers/test-db.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function setupTestDatabase() {
  // Run migrations or seed data
  await db.execute(sql`TRUNCATE TABLE bookings CASCADE`);
  await db.execute(sql`TRUNCATE TABLE properties CASCADE`);

  // Insert test data
  await db.insert(users).values({
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
  });

  await db.insert(organizations).values({
    id: 'test-org-1',
    name: 'Test Organization',
    ownerId: 'test-user-1',
  });
}

export async function cleanupTestDatabase() {
  await db.execute(sql`TRUNCATE TABLE bookings CASCADE`);
  await db.execute(sql`TRUNCATE TABLE properties CASCADE`);
}
```

## Coverage Configuration

```typescript
// bun.test.config.ts
export default {
  coverage: {
    enabled: true,
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['**/*.test.ts', '**/__tests__/**', '**/node_modules/**'],
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};
```

## Reference Documentation

- See `.cursorrules` for testing patterns
- See `docs/architecture/project-structure.md` for test file locations
- Bun test docs: https://bun.sh/docs/cli/test
- Playwright docs: https://playwright.dev/docs/intro
