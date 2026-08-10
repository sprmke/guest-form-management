/**
 * Form shell — WorkflowSubFormCard in the progress rail, Section in edit form.
 */

import type { ReactNode } from 'react';

import { Section } from '@/features/dashboard/bookings/components/booking-detail/edit/BookingEditFields';
import { WorkflowSubFormCard } from '@/features/dashboard/bookings/components/WorkflowSubFormCard';

import { cn } from '@/lib/utils';

export type WorkflowFormVariant = 'workflow' | 'edit' | 'modal';

type Props = {
  title: string;
  description?: string;
  variant?: WorkflowFormVariant;
  bodyClassName?: string;
  children: ReactNode;
};

export function WorkflowFormShell({
  title,
  description,
  variant = 'workflow',
  bodyClassName,
  children,
}: Props) {
  if (variant === 'edit') {
    return <Section title={title}>{children}</Section>;
  }

  if (variant === 'modal') {
    return <div className={cn('space-y-3', bodyClassName)}>{children}</div>;
  }

  return (
    <WorkflowSubFormCard title={title} description={description} bodyClassName={bodyClassName}>
      {children}
    </WorkflowSubFormCard>
  );
}

/** Title-case for edit Section headers (matches BookingEditForm sections). */
export function workflowFormEditTitle(raw: string): string {
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
