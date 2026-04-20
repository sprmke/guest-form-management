---
name: property-management
description: Property management domain skill for implementing bookings, properties, payments, organizations, and multi-tenancy patterns. Use when building property management features.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Property Management Domain Skill

This skill helps you implement property management business logic following established patterns.

## Domain Concepts

### Multi-Tenancy Architecture

Every query MUST be scoped to the user's organization:

```typescript
// Always filter by organizationId
const properties = await db.query.properties.findMany({
  where: and(eq(properties.organizationId, ctx.user.currentOrgId), isNull(properties.deletedAt)),
});
```

### User Roles & Permissions

```typescript
type Role = 'OWNER' | 'ADMIN' | 'PROPERTY_MANAGER' | 'SUBLEASE' | 'VIEWER';

const ROLE_PERMISSIONS = {
  OWNER: ['organizations:*', 'properties:*', 'bookings:*', 'payments:*', 'team:*'],
  ADMIN: ['properties:*', 'bookings:*', 'payments:*', 'team:read'],
  PROPERTY_MANAGER: ['properties:read', 'bookings:*', 'payments:read'],
  SUBLEASE: ['bookings:read', 'bookings:create'],
  VIEWER: ['properties:read', 'bookings:read'],
};
```

## Core Entities

### Properties

```typescript
// Property status flow
type PropertyStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

// Property creation with validation
const createPropertySchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5),
  city: z.string().min(2),
  province: z.string().min(2),
  zipCode: z.string().min(4),
  propertyType: z.enum(['CONDO', 'APARTMENT', 'HOUSE', 'TOWNHOUSE', 'VILLA']),
  bedroomCount: z.number().min(0).max(20),
  bathroomCount: z.number().min(0).max(20),
  maxGuests: z.number().min(1).max(50),
  basePrice: z.number().positive(),
});
```

### Bookings

```typescript
// Booking status flow
type BookingStatus =
  | 'PENDING_REVIEW' // New submission, awaiting review
  | 'CONFIRMED' // Approved by property manager
  | 'CHECKED_IN' // Guest has arrived
  | 'CHECKED_OUT' // Guest has departed
  | 'COMPLETED' // All payments settled
  | 'CANCELLED'; // Booking cancelled

// Status transition rules
const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_REVIEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}
```

### Payments

```typescript
type PaymentType =
  | 'BOOKING_PAYMENT' // Guest payment for booking
  | 'SECURITY_DEPOSIT' // Refundable deposit
  | 'CLEANING_FEE' // One-time fee
  | 'EXTRA_CHARGES' // Additional charges
  | 'REFUND'; // Money returned

type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'REFUNDED' | 'FAILED';

// Payment calculation
interface PaymentCalculation {
  baseAmount: number; // nights * basePrice
  cleaningFee: number;
  securityDeposit: number;
  extraCharges: number;
  discounts: number;
  taxes: number;
  totalAmount: number;
}

function calculateBookingTotal(
  basePrice: number,
  nights: number,
  options: {
    cleaningFee?: number;
    securityDeposit?: number;
    discountPercent?: number;
    taxPercent?: number;
  }
): PaymentCalculation {
  const baseAmount = basePrice * nights;
  const cleaningFee = options.cleaningFee ?? 0;
  const securityDeposit = options.securityDeposit ?? 0;
  const subtotal = baseAmount + cleaningFee;
  const discounts = subtotal * ((options.discountPercent ?? 0) / 100);
  const afterDiscount = subtotal - discounts;
  const taxes = afterDiscount * ((options.taxPercent ?? 0) / 100);

  return {
    baseAmount,
    cleaningFee,
    securityDeposit,
    extraCharges: 0,
    discounts,
    taxes,
    totalAmount: afterDiscount + taxes + securityDeposit,
  };
}
```

## Service Layer Pattern

### Booking Service

```typescript
// services/booking.service.ts
export const bookingService = {
  async getBookings(userId: string, input: BookingListInput) {
    await checkPermission(userId, 'bookings:read', input.propertyId);

    return db.query.bookings.findMany({
      where: and(
        eq(bookings.propertyId, input.propertyId),
        input.status ? eq(bookings.status, input.status) : undefined,
        isNull(bookings.deletedAt)
      ),
      with: {
        property: { columns: { name: true } },
        payments: true,
      },
      orderBy: [desc(bookings.createdAt)],
      limit: input.limit,
      offset: (input.page - 1) * input.limit,
    });
  },

  async create(userId: string, input: CreateBookingInput) {
    await checkPermission(userId, 'bookings:create', input.propertyId);

    // Validate date availability
    const conflicting = await this.checkAvailability(
      input.propertyId,
      input.checkInDate,
      input.checkOutDate
    );

    if (conflicting) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Property not available for selected dates',
      });
    }

    const [booking] = await db
      .insert(bookings)
      .values({
        ...input,
        status: 'PENDING_REVIEW',
        createdBy: userId,
      })
      .returning();

    // Send notification
    await notificationService.sendBookingCreated(booking);

    return booking;
  },

  async updateStatus(userId: string, bookingId: string, newStatus: BookingStatus) {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });

    if (!booking) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    await checkPermission(userId, 'bookings:write', booking.propertyId);

    if (!canTransition(booking.status, newStatus)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot transition from ${booking.status} to ${newStatus}`,
      });
    }

    const [updated] = await db
      .update(bookings)
      .set({ status: newStatus })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Log activity
    await activityLogService.log({
      entityType: 'booking',
      entityId: bookingId,
      action: 'status_changed',
      metadata: { from: booking.status, to: newStatus },
      userId,
    });

    return updated;
  },

  async checkAvailability(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string
  ) {
    const conflicting = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.propertyId, propertyId),
        excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
        inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN']),
        or(
          and(lte(bookings.checkInDate, checkIn), gt(bookings.checkOutDate, checkIn)),
          and(lt(bookings.checkInDate, checkOut), gte(bookings.checkOutDate, checkOut)),
          and(gte(bookings.checkInDate, checkIn), lt(bookings.checkOutDate, checkOut))
        )
      ),
    });

    return conflicting;
  },
};
```

## Guest Form System

### Dynamic Form Schema

```typescript
interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select fields
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  conditions?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: string;
  }[];
}

interface GuestForm {
  id: string;
  propertyId: string;
  name: string;
  fields: FormField[];
  isActive: boolean;
}

// Dynamic Zod schema generation
function generateFormSchema(fields: FormField[]) {
  const schemaObject: Record<string, z.ZodType> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodType;

    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email();
        break;
      case 'phone':
        fieldSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);
        break;
      case 'date':
        fieldSchema = z.coerce.date();
        break;
      case 'checkbox':
        fieldSchema = z.boolean();
        break;
      default:
        fieldSchema = z.string();
    }

    if (field.validation?.minLength) {
      fieldSchema = (fieldSchema as z.ZodString).min(field.validation.minLength);
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }

    schemaObject[field.id] = fieldSchema;
  }

  return z.object(schemaObject);
}
```

## Calendar Integration

### Availability Calendar

```typescript
interface CalendarDay {
  date: Date;
  isAvailable: boolean;
  booking?: {
    id: string;
    guestName: string;
    status: BookingStatus;
  };
  price?: number; // Dynamic pricing
}

async function getPropertyCalendar(
  propertyId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarDay[]> {
  const bookings = await db.query.bookings.findMany({
    where: and(
      eq(bookings.propertyId, propertyId),
      lte(bookings.checkInDate, endDate),
      gte(bookings.checkOutDate, startDate),
      inArray(bookings.status, ['CONFIRMED', 'CHECKED_IN'])
    ),
  });

  const pricingRules = await db.query.pricingRules.findMany({
    where: eq(pricingRules.propertyId, propertyId),
  });

  const calendar: CalendarDay[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const booking = bookings.find((b) => current >= b.checkInDate && current < b.checkOutDate);

    calendar.push({
      date: new Date(current),
      isAvailable: !booking,
      booking: booking
        ? {
            id: booking.id,
            guestName: booking.guestName,
            status: booking.status,
          }
        : undefined,
      price: calculateDynamicPrice(current, pricingRules),
    });

    current.setDate(current.getDate() + 1);
  }

  return calendar;
}
```

## Notification Patterns

### Booking Notifications

```typescript
const BOOKING_NOTIFICATIONS = {
  PENDING_REVIEW: {
    toOwner: 'New booking request from {guestName}',
    toGuest: 'Your booking request has been submitted',
  },
  CONFIRMED: {
    toGuest: 'Your booking at {propertyName} has been confirmed',
  },
  CANCELLED: {
    toGuest: 'Your booking has been cancelled',
    toOwner: 'Booking by {guestName} has been cancelled',
  },
};

async function sendBookingNotification(booking: Booking, status: BookingStatus) {
  const templates = BOOKING_NOTIFICATIONS[status];

  if (templates.toGuest) {
    await emailService.send({
      to: booking.guestEmail,
      template: 'booking-status',
      data: {
        message: templates.toGuest.replace('{propertyName}', booking.property.name),
        booking,
      },
    });
  }

  if (templates.toOwner) {
    const owners = await getPropertyOwners(booking.propertyId);
    for (const owner of owners) {
      await emailService.send({
        to: owner.email,
        template: 'booking-notification',
        data: {
          message: templates.toOwner.replace('{guestName}', booking.guestName),
          booking,
        },
      });
    }
  }
}
```

## Reference Documentation

- See `docs/database/schema.md` for full schema
  - See `docs/product/user-flows.md` for user journeys
  - See `docs/reference/feature-specifications.md` for detailed specs
