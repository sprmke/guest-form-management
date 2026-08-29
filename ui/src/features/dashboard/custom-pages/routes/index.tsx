import type { ReactNode } from 'react';

import { Navigate, Route } from 'react-router-dom';

import { CustomPagesPage } from '@/features/dashboard/custom-pages/pages/CustomPagesPage';
import type { PropertyRouteFn } from '@/features/dashboard/org/routes/guards';
import { PageEditorPage } from '@/features/dashboard/page-editor/pages/PageEditorPage';

/**
 * Public Pages (gallery + Page Editor for listing / Stay Guide / Showcase) is
 * explore-open on every plan — hosts can open the editor and see the templates.
 * The paywall is on **save**: `publicPagesAutosave` (Pro+) gates autosave / the Free
 * Save button, and `propertyShowcase` (Pro+) gates Showcase template select + publish.
 * (See docs/guides/routes/org/property/public-pages.md.)
 */
export function customPagesPropertyRoute(propertyRoute: PropertyRouteFn): ReactNode {
  return (
    <>
      <Route path="public-pages" element={propertyRoute('public-pages', <CustomPagesPage />)} />
      <Route
        path="public-pages/:pageId/edit"
        element={propertyRoute('public-pages', <PageEditorPage />)}
      />
      <Route path="custom-pages" element={<Navigate to="../public-pages" replace />} />
    </>
  );
}
