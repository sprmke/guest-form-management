import { lazy, type ComponentType } from 'react';

import type {
  ShowcaseData,
  ShowcaseTemplateKey,
} from '@/features/guest/marketing/showcase/types/showcase';

export type ShowcaseTemplateEntry = {
  key: ShowcaseTemplateKey;
  label: string;
  variant: 'aurora' | 'monolith' | 'editorial';
  component: ComponentType<{ data: ShowcaseData }>;
};

export const SHOWCASE_TEMPLATE_REGISTRY: ShowcaseTemplateEntry[] = [
  {
    key: 'showcase-aurora',
    label: 'Aurora',
    variant: 'aurora',
    component: lazy(() =>
      import('@/features/guest/marketing/showcase/templates/aurora/AuroraTemplate').then((m) => ({
        default: m.AuroraTemplate,
      }))
    ),
  },
  {
    key: 'showcase-monolith',
    label: 'Monolith',
    variant: 'monolith',
    component: lazy(() =>
      import('@/features/guest/marketing/showcase/templates/monolith/MonolithTemplate').then(
        (m) => ({
          default: m.MonolithTemplate,
        })
      )
    ),
  },
  {
    key: 'showcase-editorial',
    label: 'Editorial',
    variant: 'editorial',
    component: lazy(() =>
      import('@/features/guest/marketing/showcase/templates/editorial/EditorialTemplate').then(
        (m) => ({
          default: m.EditorialTemplate,
        })
      )
    ),
  },
];

export function getShowcaseTemplate(key: string): ShowcaseTemplateEntry {
  return (
    SHOWCASE_TEMPLATE_REGISTRY.find((entry) => entry.key === key) ?? SHOWCASE_TEMPLATE_REGISTRY[0]!
  );
}
