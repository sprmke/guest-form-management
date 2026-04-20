---
name: ui-design
description: UI/UX design skill for creating professional, responsive, and performant user interfaces. Use when generating mockups, designing components, implementing layouts, or optimizing UI performance.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# UI/UX Design Skill

This skill helps you create beautiful, professional, and user-friendly interfaces.

## Tech Stack Context
- **Framework**: Next.js 16+ (App Router)
- **UI Library**: shadcn/ui + Tailwind CSS
- **Animations**: Framer Motion (optional)
- **Icons**: Lucide React

## Design Principles

1. **Mobile-First**: Design for mobile, then scale up
2. **Consistency**: Use design system tokens
3. **Clarity**: Clear visual hierarchy
4. **Performance**: Optimize for speed
5. **Accessibility**: WCAG 2.1 AA compliant

## Responsive Breakpoints

```typescript
// Tailwind breakpoints
sm: '640px'   // Large phones
md: '768px'   // Tablets
lg: '1024px'  // Desktops
xl: '1280px'  // Large desktops
```

## Layout Patterns

### Page Layout
```typescript
export function PageLayout({ title, description, actions, children }) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      
      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
```

### Responsive Grid
```typescript
// Auto-fit grid (recommended)
<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// Fixed columns
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### Two-Column Layout
```typescript
<div className="grid gap-6 lg:grid-cols-[1fr_300px]">
  <main>{/* Main content */}</main>
  <aside className="hidden lg:block">{/* Sidebar */}</aside>
</div>
```

## Card Components

### Stats Card
```typescript
<Card>
  <CardHeader className="flex flex-row items-center justify-between pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      Total Revenue
    </CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">₱45,231.89</div>
    <p className="text-xs text-success flex items-center gap-1">
      <TrendingUp className="h-3 w-3" />
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

### Interactive Card
```typescript
<Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
  <CardContent className="p-4">
    {/* Content */}
  </CardContent>
</Card>
```

## Loading States

### Skeleton Loader
```typescript
export function Skeleton({ className }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  );
}

// Card Skeleton
<div className="rounded-lg border p-6 space-y-4">
  <Skeleton className="h-6 w-1/2" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

### Loading Button
```typescript
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

## Empty & Error States

### Empty State
```typescript
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <Calendar className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold">No bookings yet</h3>
  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
    Get started by creating your first booking.
  </p>
  <Button className="mt-4">Create Booking</Button>
</div>
```

### Error State
```typescript
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-destructive/10 p-4 mb-4">
    <AlertTriangle className="h-8 w-8 text-destructive" />
  </div>
  <h3 className="text-lg font-semibold">Something went wrong</h3>
  <p className="text-sm text-muted-foreground mt-1">
    Please try again later.
  </p>
  <Button variant="outline" className="mt-4" onClick={onRetry}>
    <RefreshCw className="mr-2 h-4 w-4" />
    Try Again
  </Button>
</div>
```

## Form Patterns

### Form Field
```typescript
<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input
    id="name"
    placeholder="Enter your name"
    {...register('name')}
  />
  {errors.name && (
    <p className="text-sm text-destructive">{errors.name.message}</p>
  )}
</div>
```

### Form Layout
```typescript
// Single column (mobile-friendly)
<form className="space-y-4">
  <FormField name="guestName" />
  <FormField name="email" />
  <FormField name="phone" />
</form>

// Two columns on desktop
<form className="space-y-4">
  <div className="grid gap-4 sm:grid-cols-2">
    <FormField name="firstName" />
    <FormField name="lastName" />
  </div>
  <FormField name="email" />
</form>
```

## Table → Cards on Mobile

```typescript
// Desktop: Table, Mobile: Cards
export function ResponsiveBookings({ bookings }) {
  return (
    <>
      {/* Mobile: Card List */}
      <div className="space-y-4 lg:hidden">
        {bookings.map(booking => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
      
      {/* Desktop: Table */}
      <div className="hidden lg:block">
        <DataTable columns={columns} data={bookings} />
      </div>
    </>
  );
}
```

## Animation Patterns

### Hover Effects
```typescript
// Subtle lift
className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1"

// Border highlight
className="transition-colors hover:border-primary"

// Scale
className="transition-transform hover:scale-105 active:scale-95"
```

### Page Transitions (Framer Motion)
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

### Staggered List
```typescript
<motion.ul
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.1 } },
  }}
>
  {items.map(item => (
    <motion.li
      key={item.id}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
      }}
    >
      <ItemCard item={item} />
    </motion.li>
  ))}
</motion.ul>
```

## Touch-Friendly Design

```typescript
// Minimum touch target: 44x44px
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon className="h-5 w-5" />
</button>

// Spacing for touch
<div className="space-y-3"> {/* More spacing on mobile */}
  {items.map(item => (
    <TouchableItem key={item.id} />
  ))}
</div>
```

## Accessibility Essentials

```typescript
// Focus states
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Screen reader only
className="sr-only"

// Icon with label
<button aria-label="Delete booking">
  <TrashIcon aria-hidden="true" />
</button>

// Form labels
<Label htmlFor="email">Email</Label>
<Input id="email" />
```

## Performance Tips

1. **Lazy load heavy components**
```typescript
const Chart = lazy(() => import('./Chart'));
```

2. **Use skeleton loaders**
```typescript
<Suspense fallback={<Skeleton />}>
  <AsyncComponent />
</Suspense>
```

3. **Optimize images**
```typescript
<Image
  src={src}
  alt={alt}
  width={400}
  height={300}
  placeholder="blur"
  priority={isAboveFold}
/>
```

4. **Virtualize long lists**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
```

## Design Checklist

- [ ] Mobile-first responsive
- [ ] Touch targets ≥ 44px
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error states
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] Color contrast (4.5:1)
- [ ] Dark mode support
- [ ] Reduced motion support

## Reference Documentation
- See `.cursor/rules/13-ui-ux-design.mdc` for detailed guidelines
- See `.cursor/rules/05-components.mdc` for component patterns


