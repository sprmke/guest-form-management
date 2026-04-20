---
name: drizzle-orm
description: Drizzle ORM skill for creating schemas, queries, relations, and migrations. Use when working with database operations, creating tables, writing queries, or managing migrations in this Next.js project.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Drizzle ORM Skill

This skill helps you work with Drizzle ORM for type-safe database operations.

## Tech Stack Context

- **Database**: PostgreSQL on Neon
- **ORM**: Drizzle ORM
- **Runtime**: Bun

## Schema Location

- Schema files: `packages/database/src/schema/`
- Drizzle config: `packages/database/drizzle.config.ts`
- Client: `packages/database/src/client.ts`

## Schema Definition Patterns

### Basic Table with Timestamps

```typescript
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

export const tableName = pgTable(
  'table_name',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Always include these timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  (table) => ({
    nameIdx: index('table_name_idx').on(table.name),
  })
);
```

### Enum Definition

```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['ACTIVE', 'INACTIVE', 'PENDING']);

// Usage in table
status: statusEnum('status').notNull().default('ACTIVE'),
```

### Relations

```typescript
import { relations } from 'drizzle-orm';

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  organizationMembers: many(organizationMembers),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [bookings.propertyId],
    references: [properties.id],
  }),
}));
```

### Foreign Keys with Cascade

```typescript
userId: uuid('user_id')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

## Query Patterns

### Select with Relations

```typescript
const result = await db.query.bookings.findMany({
  where: and(eq(bookings.propertyId, propertyId), isNull(bookings.deletedAt)),
  with: {
    property: true,
    payments: {
      columns: { amount: true, type: true },
    },
  },
  limit: 20,
  offset: 0,
});
```

### Insert with Returning

```typescript
const [newBooking] = await db
  .insert(bookings)
  .values({
    propertyId,
    guestName,
    checkInDate,
    checkOutDate,
    status: 'PENDING_REVIEW',
  })
  .returning();
```

### Update

```typescript
await db
  .update(bookings)
  .set({ status: 'CONFIRMED', updatedAt: new Date() })
  .where(eq(bookings.id, bookingId));
```

### Soft Delete

```typescript
await db.update(bookings).set({ deletedAt: new Date() }).where(eq(bookings.id, bookingId));
```

### Transaction

```typescript
await db.transaction(async (tx) => {
  await tx.update(bookings).set({ status: 'COMPLETED' }).where(eq(bookings.id, id));
  await tx.insert(payments).values(paymentData);
  await tx.insert(activityLogs).values(activityData);
});
```

### Count Query

```typescript
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(bookings)
  .where(and(...conditions));
```

## Drizzle Commands

```bash
# Generate migrations
bun db:generate

# Run migrations
bun db:migrate

# Push schema (dev only)
bun db:push

# Open Drizzle Studio
bun db:studio
```

## Multi-Tenancy Pattern

Always filter by organizationId:

```typescript
const properties = await db
  .select()
  .from(properties)
  .where(and(eq(properties.organizationId, ctx.user.currentOrgId), isNull(properties.deletedAt)));
```

## Reference Documentation

- See `docs/database/schema.md` for full schema
- See `.cursorrules` for coding patterns
