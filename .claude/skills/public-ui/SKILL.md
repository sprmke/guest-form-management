---
name: public-ui
description: Public/guest-facing UI skill for property browsing, booking flow, guest forms, and marketing pages. Use when building public pages, property listing/detail, booking widget, guest auth modal, or SEO for Kame Homes.
---

# Public UI Development Skill

Build public/guest-facing pages for property browsing, booking, and form submission.

## When to Use This Skill

Use this skill when:

- Creating property listing/search pages
- Building property detail pages
- Implementing booking flow for guests
- Creating public calendar views
- Building marketing/landing pages
- Working with SEO optimization
- Creating shared components (dashboard + public)
- Implementing guest authentication (modal-based)

## Reference Documentation

Before implementing, read these documents:

- `@docs/product/public-ui.md` - Complete public UI specs
- `@docs/architecture/project-structure.md` - Feature organization (see Shared Auth section)
- `.cursor/rules/14-public-ui.mdc` - Public UI patterns

## Authentication for Guests

**Key Principle**: Guests use modal auth, hosts use full-page auth.

### Auth Approach

| User Type    | Auth UI              | After Login           |
| ------------ | -------------------- | --------------------- |
| Host/Manager | Full page (`/login`) | Redirect to dashboard |
| Guest        | Modal overlay        | Stay on current page  |

### Shared Auth Structure

```
features/shared/auth/          # Core forms (SHARED)
├── components/
│   ├── LoginForm.tsx          # Form only, no layout
│   ├── RegisterForm.tsx       # Form only, no layout
│   └── SocialAuthButtons.tsx  # OAuth buttons
├── hooks/
│   ├── use-session.ts         # Session management
│   └── use-auth-modal.ts      # Modal state (Zustand)
└── api/use-auth.ts            # Auth API hooks

features/public/auth/          # Public-specific (modal)
└── components/
    └── AuthModal.tsx          # Modal wrapping shared forms

features/dashboard/auth/       # Dashboard-specific (full page)
└── components/
    ├── AuthLayout.tsx         # Split-screen layout
    └── LoginPage.tsx          # Full page with AuthLayout
```

### Auth Modal Store

```typescript
// features/shared/auth/hooks/use-auth-modal.ts
import { create } from 'zustand';

type AuthMode = 'login' | 'register' | 'forgot-password';

interface AuthModalState {
  isOpen: boolean;
  mode: AuthMode;
  returnUrl?: string;
  open: (mode?: AuthMode, returnUrl?: string) => void;
  close: () => void;
  switchMode: (mode: AuthMode) => void;
}

export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: 'login',
  returnUrl: undefined,
  open: (mode = 'login', returnUrl) => set({ isOpen: true, mode, returnUrl }),
  close: () => set({ isOpen: false }),
  switchMode: (mode) => set({ mode }),
}));
```

### Trigger Auth Modal (instead of redirect)

```typescript
// Example: Require auth for booking
import { useAuthModal } from '@/features/shared/auth/hooks/use-auth-modal';

function BookNowButton({ property }: { property: Property }) {
  const { data: session } = useSession();
  const { open: openAuthModal } = useAuthModal();
  const router = useRouter();

  const handleClick = () => {
    if (!session) {
      // Show modal, don't redirect to /login
      openAuthModal('login', `/properties/${property.slug}/book`);
      return;
    }
    router.push(`/properties/${property.slug}/book`);
  };

  return <Button onClick={handleClick}>Book Now</Button>;
}
```

### Add AuthModal to Public Layout

```typescript
// app/(public)/layout.tsx
import { AuthModal } from '@/features/public/auth/components/AuthModal';

export default function PublicLayout({ children }) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
      <AuthModal />  {/* Always in DOM, controlled by Zustand */}
    </>
  );
}
```

## Route Structure

### Route Groups

```
(marketing)/     → Landing, about, pricing (SEO-optimized)
(public)/        → Property browsing, booking (guest-facing)
(dashboard)/     → Admin pages (auth required)
(auth)/          → Login, register (hosts only, full page)
```

### Landing Pages

| Route        | Audience | Purpose                  | Primary CTA      |
| ------------ | -------- | ------------------------ | ---------------- |
| `/`          | Guests   | Find & book properties   | Search bar       |
| `/for-hosts` | Hosts    | List & manage properties | Get Started Free |

**Cross-linking**:

- Host landing (`/for-hosts`) → "Looking for a stay?" → `/properties`

### All Public Routes

```
/                           → Guest landing (search properties)
/for-hosts                  → Host landing (list properties)
/about                      → About page
/pricing                    → Pricing page (for hosts)
/properties                 → Property listing/search
/properties/map             → Map view
/properties/[propertySlug]  → Property detail
/properties/[propertySlug]/book → Booking flow
/properties/[propertyId]/forms/[formId] → Public guest form (property-scoped)
/calendars/[propertyId]     → Public calendar embed
```

## Feature Organization

### File Locations

```typescript
// Public features
features/public/properties/     // Property browsing
features/public/booking/        // Booking flow
features/public/forms/          // Form viewer
features/public/calendar/       // Calendar embed

// Marketing features
features/marketing/guest-landing/   // Guest landing page components
features/marketing/host-landing/    // Host landing page components
features/marketing/shared/          // Shared marketing components

// Shared features (dashboard + public)
features/shared/property/       // PropertyCard, Gallery, etc.
features/shared/calendar/       // CalendarView
features/shared/forms/          // FormRenderer
```

## Landing Pages

### Guest Landing (`/`)

Target: Travelers looking for properties

```typescript
// app/(marketing)/page.tsx
import { GuestHero } from '@/features/marketing/guest-landing/components/GuestHero';
import { FeaturedProperties } from '@/features/marketing/guest-landing/components/FeaturedProperties';

export default async function GuestLandingPage() {
  const featured = await api.public.properties.featured();

  return (
    <>
      <GuestHero />  {/* Hero with search bar */}
      <FeaturedProperties properties={featured} />
      <PopularDestinations />
      <GuestHowItWorks />  {/* Search → Book → Stay */}
      <GuestTestimonials />
    </>
  );
}

export const revalidate = 300; // ISR every 5 minutes
```

### Host Landing (`/for-hosts`)

Target: Property owners/managers

```typescript
// app/(marketing)/for-hosts/page.tsx
import { HostHero } from '@/features/marketing/host-landing/components/HostHero';
import { FeaturesGrid } from '@/features/marketing/host-landing/components/FeaturesGrid';

export default function HostLandingPage() {
  return (
    <>
      <HostHero />  {/* Hero with dashboard preview */}
      <FeaturesGrid />  {/* Platform features */}
      <HostHowItWorks />  {/* Add property → Customize → Grow */}
      <PricingSection />  {/* Pricing cards */}
      <HostTestimonials />
      <HostCTA />  {/* Final call-to-action */}
    </>
  );
}

export const dynamic = 'force-static';
```

### Guest Hero with Search

```typescript
// features/marketing/guest-landing/components/GuestHero.tsx
'use client';

export function GuestHero() {
  const router = useRouter();
  const [search, setSearch] = useState({
    location: '',
    checkIn: null,
    checkOut: null,
    guests: 1,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search.location) params.set('location', search.location);
    // ... add other params
    router.push(`/properties?${params.toString()}`);
  };

  return (
    <section className="relative h-[600px] flex items-center justify-center">
      <Image src="/hero-bg.jpg" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 text-center text-white max-w-4xl px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Find your perfect vacation rental
        </h1>
        <p className="text-xl mb-8">
          Discover amazing properties across the Philippines
        </p>

        {/* Search bar */}
        <SearchBar
          value={search}
          onChange={setSearch}
          onSearch={handleSearch}
        />
      </div>
    </section>
  );
}
```

### Cross-Linking Navigation

```typescript
// Guest landing header
<header>
  <Logo />
  <nav>...</nav>
</header>

// Host landing footer
<footer>
  <p className="text-sm">
    Looking for a place to stay?{' '}
    <Link href="/properties">Browse properties</Link>
  </p>
</footer>
```

## Implementation Patterns

### Property Listing Page

```typescript
// app/(public)/properties/page.tsx
import { PropertySearch } from '@/features/public/properties/components/PropertySearch';
import { PropertyFilters } from '@/features/public/properties/components/PropertyFilters';
import { PropertyGrid } from '@/features/public/properties/components/PropertyGrid';
import { api } from '@/lib/api/server';

interface SearchParams {
  search?: string;
  city?: string;
  type?: string;
  minPrice?: string;
  maxPrice?: string;
  guests?: string;
  checkIn?: string;
  checkOut?: string;
  page?: string;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    search: searchParams.search,
    city: searchParams.city,
    type: searchParams.type as PropertyType | undefined,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    guests: searchParams.guests ? Number(searchParams.guests) : undefined,
    checkInDate: searchParams.checkIn ? new Date(searchParams.checkIn) : undefined,
    checkOutDate: searchParams.checkOut ? new Date(searchParams.checkOut) : undefined,
    page: searchParams.page ? Number(searchParams.page) : 1,
    limit: 12,
  };

  const initialData = await api.public.properties.list(filters);

  return (
    <div className="container py-8">
      {/* Search Bar */}
      <PropertySearch initialFilters={filters} className="mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <PropertyFilters initialFilters={filters} />
        </aside>

        {/* Results */}
        <main className="lg:col-span-3">
          <PropertyGrid
            initialData={initialData.data}
            pagination={initialData.pagination}
          />
        </main>
      </div>
    </div>
  );
}

// Metadata
export async function generateMetadata({ searchParams }) {
  const city = searchParams.city;
  return {
    title: city
      ? `Properties in ${city} | Kame Homes`
      : 'Properties | Kame Homes',
    description: `Find your perfect vacation rental...`,
  };
}
```

### Property Detail Page

```typescript
// app/(public)/properties/[propertySlug]/page.tsx
import { notFound } from 'next/navigation';
import { PropertyGallery } from '@/features/shared/property/components/PropertyGallery';
import { PropertyInfo } from '@/features/public/properties/components/PropertyInfo';
import { BookingWidget } from '@/features/public/booking/components/BookingWidget';
import { PropertyCalendar } from '@/features/public/calendar/components/PropertyCalendar';
import { api } from '@/lib/api/server';

interface PageProps {
  params: { propertySlug: string };
  searchParams: { checkIn?: string; checkOut?: string; guests?: string };
}

export default async function PropertyDetailPage({ params, searchParams }: PageProps) {
  const property = await api.public.properties.getBySlug({
    slug: params.propertySlug,
  });

  if (!property) {
    notFound();
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <PropertyStructuredData property={property} />

      <div className="container py-8">
        {/* Image Gallery */}
        <PropertyGallery images={property.images} variant="viewer" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <PropertyHeader property={property} />
            <PropertyHighlights property={property} />
            <PropertyDescription description={property.description} />
            <AmenityList amenities={property.amenities} variant="full" />
            <HouseRules rules={property.rules} />
            <PropertyCalendar propertyId={property.id} />
            <PropertyLocation property={property} />
          </div>

          {/* Sticky Booking Widget */}
          <aside className="lg:col-span-1">
            <BookingWidget
              property={property}
              initialDates={{
                checkIn: searchParams.checkIn,
                checkOut: searchParams.checkOut,
              }}
              initialGuests={Number(searchParams.guests) || 1}
            />
          </aside>
        </div>
      </div>
    </>
  );
}

// Dynamic metadata
export async function generateMetadata({ params }) {
  const property = await api.public.properties.getBySlug({
    slug: params.propertySlug,
  });

  if (!property) return {};

  return {
    title: `${property.name} | Kame Homes`,
    description: property.description?.slice(0, 160),
    openGraph: {
      title: property.name,
      description: property.description,
      images: property.images.slice(0, 3).map((img) => img.url),
    },
  };
}
```

### Shared Component Pattern

```typescript
// features/shared/property/components/PropertyCard.tsx
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

interface PropertyCardProps {
  property: Property;
  variant: 'dashboard' | 'public';
  showActions?: boolean;
  showBookButton?: boolean;
  className?: string;
}

export function PropertyCard({
  property,
  variant,
  showActions = false,
  showBookButton = false,
  className,
}: PropertyCardProps) {
  const href = variant === 'dashboard'
    ? `/property/${property.slug}/dashboard`
    : `/properties/${property.slug}`;

  return (
    <Link href={href} className={cn('block group', className)}>
      <div
        className={cn(
          'rounded-lg border overflow-hidden transition-all',
          variant === 'dashboard' && 'bg-card hover:border-primary',
          variant === 'public' && 'bg-white shadow-md hover:shadow-xl'
        )}
      >
        {/* Image */}
        <div className="relative aspect-[4/3]">
          <Image
            src={property.thumbnail || '/placeholder.jpg'}
            alt={property.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {variant === 'public' && (
            <div className="absolute top-3 right-3">
              <SaveButton propertyId={property.id} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-1">{property.name}</h3>
          <p className="text-muted-foreground text-sm">{property.city}</p>

          <div className="flex items-center justify-between mt-2">
            <PriceDisplay price={property.baseRate} period="night" />

            {variant === 'dashboard' && (
              <StatusBadge status={property.status} />
            )}
          </div>
        </div>

        {/* Actions */}
        {variant === 'dashboard' && showActions && (
          <CardActions property={property} />
        )}
        {variant === 'public' && showBookButton && (
          <div className="px-4 pb-4">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </div>
        )}
      </div>
    </Link>
  );
}
```

### Public tRPC Router

```typescript
// server/routers/public/properties.ts
import { router } from '../../trpc';
import { publicProcedure } from '../../procedures/public';
import { z } from 'zod';

const searchFiltersSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  type: z.enum(['APARTMENT', 'CONDO', 'HOUSE', 'VILLA']).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  guests: z.number().optional(),
  checkInDate: z.date().optional(),
  checkOutDate: z.date().optional(),
  amenities: z.array(z.string()).optional(),
  page: z.number().default(1),
  limit: z.number().default(12).max(50),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'newest']).default('relevance'),
});

export const publicPropertiesRouter = router({
  list: publicProcedure.input(searchFiltersSchema).query(async ({ input }) => {
    return propertyService.getPublicProperties(input);
  }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const property = await propertyService.getPublicPropertyBySlug(input.slug);

    if (!property) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return property;
  }),

  checkAvailability: publicProcedure
    .input(
      z.object({
        propertyId: z.string(),
        checkInDate: z.date(),
        checkOutDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return calendarService.checkAvailability(input);
    }),

  calculatePrice: publicProcedure
    .input(
      z.object({
        propertyId: z.string(),
        checkInDate: z.date(),
        checkOutDate: z.date(),
        guests: z.number(),
      })
    )
    .query(async ({ input }) => {
      return pricingService.calculateBookingPrice(input);
    }),
});
```

## SEO Best Practices

### Metadata Generation

```typescript
// For static pages
export const metadata: Metadata = {
  title: 'Properties | Kame Homes',
  description: 'Find your perfect vacation rental...',
};

// For dynamic pages
export async function generateMetadata({ params }): Promise<Metadata> {
  const property = await getProperty(params.slug);
  return {
    title: `${property.name} | Kame Homes`,
    description: property.description,
    openGraph: {
      images: [property.thumbnail],
    },
  };
}
```

### Structured Data

```typescript
// Property structured data
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'LodgingBusiness',
  name: property.name,
  description: property.description,
  image: property.images.map((i) => i.url),
  address: {
    '@type': 'PostalAddress',
    addressLocality: property.city,
    addressCountry: property.country,
  },
  priceRange: `₱${property.baseRate}/night`,
  amenityFeature: property.amenities.map((a) => ({
    '@type': 'LocationFeatureSpecification',
    name: a,
  })),
};
```

### Sitemap Generation

```typescript
// app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await getPublicProperties();

  const propertyUrls = properties.map((p) => ({
    url: `https://kamehomes.com/properties/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    { url: 'https://kamehomes.com', priority: 1 },
    { url: 'https://kamehomes.com/properties', priority: 0.9 },
    { url: 'https://kamehomes.com/pricing', priority: 0.7 },
    ...propertyUrls,
  ];
}
```

## Performance Optimization

### Image Optimization

```typescript
import Image from 'next/image';

<Image
  src={property.thumbnail}
  alt={property.name}
  width={400}
  height={300}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  priority={isAboveTheFold}
  placeholder="blur"
  blurDataURL={property.thumbnailBlur}
/>
```

### Static/ISR Configuration

```typescript
// Marketing pages - static
export const dynamic = 'force-static';

// Property pages - ISR
export const revalidate = 60; // 1 minute

// Search pages - dynamic
export const dynamic = 'force-dynamic';
```

## Testing Checklist

- [ ] Property search returns results
- [ ] Filters work correctly
- [ ] Property detail loads with all sections
- [ ] Booking widget calculates price
- [ ] Availability check works
- [ ] Form submission creates booking
- [ ] Calendar shows booked dates
- [ ] Mobile responsive
- [ ] SEO metadata renders
- [ ] Structured data is valid
- [ ] Performance < 3 second load
- [ ] Accessibility passes
