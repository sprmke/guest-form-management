/**
 * Form shell — WorkflowSubFormCard in the progress rail, Section in edit form.
 */

import type { ReactNode } from 'react';
import { Section } from '@/features/admin/components/bookingEditLayout';
import { WorkflowSubFormCard } from '@/features/admin/components/WorkflowSubFormCard';

export type WorkflowFormVariant = 'workflow' | 'edit';

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

  return (
    <WorkflowSubFormCard
      title={title}
      description={description}
      bodyClassName={bodyClassName}
    >
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
