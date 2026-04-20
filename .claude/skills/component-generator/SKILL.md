---
name: component-generator
description: React component generator skill for creating type-safe, accessible, and well-structured components. Use when building new UI components, forms, pages, or feature modules.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# React Component Generator Skill

This skill helps you generate React components following project patterns and best practices.

## Tech Stack Context

- **Framework**: React 19 with Server Components
- **Styling**: Tailwind CSS + shadcn/ui
- **Types**: TypeScript strict mode
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query via tRPC

## File Locations

- UI Components: `apps/web/src/components/ui/` (shadcn primitives)
- Feature Components: `apps/web/src/components/[feature]/`
- Pages: `apps/web/src/app/`
- Hooks: `apps/web/src/hooks/`

## Component Templates

### Server Component (Default)

```tsx
// components/[feature]/feature-list.tsx
import { db } from '@/lib/db';
import { FeatureCard } from './feature-card';

interface FeatureListProps {
  organizationId: string;
}

export async function FeatureList({ organizationId }: FeatureListProps) {
  const items = await db.query.features.findMany({
    where: eq(features.organizationId, organizationId),
  });

  if (items.length === 0) {
    return <EmptyState title="No items" description="Get started by creating one." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <FeatureCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### Client Component

```tsx
// components/[feature]/feature-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FeatureFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FeatureForm({ onSuccess, onCancel }: FeatureFormProps) {
  const utils = api.useUtils();

  const createMutation = api.features.create.useMutation({
    onSuccess: () => {
      utils.features.list.invalidate();
      toast.success('Created successfully');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Enter name"
          {...register('name')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description"
          {...register('description')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
          {(isSubmitting || createMutation.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create
        </Button>
      </div>
    </form>
  );
}
```

### Page Component

```tsx
// app/(dashboard)/[feature]/page.tsx
import { Suspense } from 'react';
import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { FeatureList } from '@/components/[feature]/feature-list';
import { FeatureListSkeleton } from '@/components/[feature]/feature-list-skeleton';
import { CreateFeatureButton } from '@/components/[feature]/create-feature-button';

export const metadata = {
  title: 'Features | Property Management',
  description: 'Manage your features',
};

export default async function FeaturesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Features"
        description="Manage all your features in one place"
        actions={<CreateFeatureButton />}
      />

      <Suspense fallback={<FeatureListSkeleton />}>
        <FeatureList organizationId={session.user.currentOrgId} />
      </Suspense>
    </div>
  );
}
```

### Detail Page with Tabs

```tsx
// app/(dashboard)/[feature]/[id]/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureDetails } from '@/components/[feature]/feature-details';
import { FeatureSettings } from '@/components/[feature]/feature-settings';
import { FeatureActivity } from '@/components/[feature]/feature-activity';
import { PageHeader } from '@/components/layout/page-header';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FeatureDetailPage({ params }: PageProps) {
  const { id } = await params;

  const feature = await db.query.features.findFirst({
    where: eq(features.id, id),
  });

  if (!feature) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={feature.name}
        breadcrumbs={[{ label: 'Features', href: '/features' }, { label: feature.name }]}
      />

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Suspense fallback={<DetailsSkeleton />}>
            <FeatureDetails id={id} />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <FeatureSettings id={id} />
        </TabsContent>

        <TabsContent value="activity">
          <Suspense fallback={<ActivitySkeleton />}>
            <FeatureActivity id={id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Modal/Dialog Component

```tsx
// components/[feature]/create-feature-dialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { FeatureForm } from './feature-form';

export function CreateFeatureDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Feature
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Feature</DialogTitle>
          <DialogDescription>Fill in the details below to create a new feature.</DialogDescription>
        </DialogHeader>
        <FeatureForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
```

### Card Component

```tsx
// components/[feature]/feature-card.tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FeatureCardProps {
  feature: Feature;
}

export function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg">
            <Link href={`/features/${feature.id}`} className="underline-offset-4 hover:underline">
              {feature.name}
            </Link>
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {feature.description || 'No description'}
          </CardDescription>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/features/${feature.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <Badge variant={feature.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {feature.status}
          </Badge>
          <span>Updated {formatDistanceToNow(feature.updatedAt, { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Skeleton Component

```tsx
// components/[feature]/feature-card-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function FeatureCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function FeatureListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <FeatureCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Hook Pattern

```tsx
// hooks/use-features.ts
'use client';

import { api } from '@/lib/api/client';
import { useCallback, useMemo } from 'react';

export function useFeatures(filters?: FeatureFilters) {
  const { data, isLoading, error, refetch } = api.features.list.useQuery(
    filters ?? {},
    { staleTime: 1000 * 60 * 5 } // 5 minutes
  );

  return {
    features: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
}

export function useFeatureMutations() {
  const utils = api.useUtils();

  const createFeature = api.features.create.useMutation({
    onSuccess: () => {
      utils.features.list.invalidate();
    },
  });

  const updateFeature = api.features.update.useMutation({
    onSuccess: (_, variables) => {
      utils.features.byId.invalidate({ id: variables.id });
      utils.features.list.invalidate();
    },
  });

  const deleteFeature = api.features.delete.useMutation({
    onSuccess: () => {
      utils.features.list.invalidate();
    },
  });

  return {
    createFeature,
    updateFeature,
    deleteFeature,
    isLoading: createFeature.isPending || updateFeature.isPending || deleteFeature.isPending,
  };
}
```

### Confirmation Dialog

```tsx
// components/ui/confirm-dialog.tsx
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## Naming Conventions

### Files

- Components: `kebab-case.tsx` (e.g., `property-card.tsx`)
- Hooks: `use-feature-name.ts` (e.g., `use-bookings.ts`)
- Utils: `kebab-case.ts` (e.g., `format-currency.ts`)

### Components

- PascalCase: `PropertyCard`, `BookingForm`, `EmptyState`
- Props interface: `[ComponentName]Props`

### Exports

- Named exports for components
- Default exports only for page components

## Component Checklist

### Before Creating

- [ ] Check if similar component exists
- [ ] Determine if Server or Client Component
- [ ] Identify props interface
- [ ] Plan loading and error states

### Quality Checks

- [ ] TypeScript strict - no `any`
- [ ] Proper accessibility (labels, aria, keyboard)
- [ ] Responsive design (mobile-first)
- [ ] Loading states
- [ ] Error handling
- [ ] Empty states
- [ ] Proper file location

## Reference Documentation

- See `.cursorrules` for coding patterns
- See `docs/architecture/project-structure.md` for file organization
- See `ui-ux-design` skill for design patterns
