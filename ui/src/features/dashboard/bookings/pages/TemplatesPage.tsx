import * as React from 'react';

import { ClipboardList, ExternalLink } from 'lucide-react';

import { AdminPageHeader } from '@/features/dashboard/bookings/components/AdminPageHeader';
import {
  AdminSectionGroupHeading,
  AdminSectionNavLayout,
  type AdminSectionNavGroup,
} from '@/features/dashboard/bookings/components/AdminSectionNavLayout';
import { AddCustomTemplateDialog } from '@/features/dashboard/bookings/components/property-templates/AddCustomTemplateDialog';
import { PropertyTemplateEditorCard } from '@/features/dashboard/bookings/components/property-templates/PropertyTemplateEditorCard';
import {
  usePropertyTemplateMutations,
  usePropertyTemplates,
  type PropertyTemplateDto,
} from '@/features/dashboard/bookings/hooks/usePropertyTemplates';
import {
  EMAIL_TEMPLATE_SECTIONS,
  iconForTemplateKey,
  STANDARD_TEMPLATE_SECTIONS,
} from '@/features/dashboard/bookings/lib/propertyTemplateSections';
import { useOptionalOrgContext } from '@/features/dashboard/org/components/RequireOrgContext';
import { usePropertyIdParam } from '@/features/dashboard/org/lib/adminApiScope';
import { guestStayGuidePreviewPath } from '@/features/guest/lib/guestPublicPaths';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function TemplatesPageSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  );
}

function templateByKey(
  templates: PropertyTemplateDto[],
  key: string
): PropertyTemplateDto | undefined {
  return templates.find((t) => t.templateKey === key);
}

export function TemplatesPage() {
  const { data, isLoading, error } = usePropertyTemplates();
  const templates = data?.templates;
  const { saveTemplate, createCustomTemplate, deleteCustomTemplate } =
    usePropertyTemplateMutations();
  const orgContext = useOptionalOrgContext();
  const propertySlug = orgContext?.property.slug ?? '';
  const propertyId = usePropertyIdParam();

  const stayGuidePreviewHref = React.useMemo(() => {
    if (!propertySlug.trim() || !propertyId) return null;
    if (typeof window === 'undefined') return guestStayGuidePreviewPath(propertySlug, propertyId);
    return `${window.location.origin}${guestStayGuidePreviewPath(propertySlug, propertyId)}`;
  }, [propertyId, propertySlug]);

  const customTemplates = React.useMemo(
    () => (templates ?? []).filter((t) => t.category === 'custom'),
    [templates]
  );

  const sectionGroups = React.useMemo((): AdminSectionNavGroup[] => {
    const groups: AdminSectionNavGroup[] = [
      {
        label: 'Standard templates',
        sections: STANDARD_TEMPLATE_SECTIONS.map((s) => ({
          id: s.templateKey,
          label: s.label,
          icon: s.icon,
        })),
      },
      {
        label: 'Email templates',
        sections: EMAIL_TEMPLATE_SECTIONS.map((s) => ({
          id: s.templateKey,
          label: s.label,
          icon: s.icon,
        })),
      },
    ];
    if (customTemplates.length > 0) {
      groups.push({
        label: 'Custom templates',
        sections: customTemplates.map((t) => ({
          id: t.templateKey,
          label: t.name,
          icon: ClipboardList,
        })),
      });
    }
    return groups;
  }, [customTemplates]);

  const handleSave = async (
    templateKey: string,
    input: { content: string; sectionImageUrl?: string | null }
  ) => {
    await saveTemplate.mutateAsync({ templateKey, ...input });
  };

  const handleReset = async (template: PropertyTemplateDto) => {
    await saveTemplate.mutateAsync({
      templateKey: template.templateKey,
      content: template.defaultContent,
      sectionImageUrl: null,
    });
  };

  return (
    
      <AdminSectionNavLayout
        sectionGroups={sectionGroups}
        header={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <AdminPageHeader
              id="templates-heading"
              variant="compact"
              title="Templates"
              subtitle="Manage your property's house rules, instructions, and email templates."
            />
            <AddCustomTemplateDialog
              busy={createCustomTemplate.isPending}
              onAdd={async (name, content) => {
                await createCustomTemplate.mutateAsync({ name, content });
              }}
            />
          </div>
        }
      >
        {isLoading ? <TemplatesPageSkeleton /> : null}
        {error ? <p className="text-destructive text-sm">Failed to load templates.</p> : null}

        {templates ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-4">
              <AdminSectionGroupHeading
                title="Standard templates"
                count={STANDARD_TEMPLATE_SECTIONS.length}
                action={
                  stayGuidePreviewHref ? (
                    <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
                      <a
                        href={stayGuidePreviewHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Preview stay guide in a new tab"
                      >
                        Preview stay guide
                        <ExternalLink className="ml-1.5 size-3.5 shrink-0" aria-hidden />
                      </a>
                    </Button>
                  ) : null
                }
              />
              {STANDARD_TEMPLATE_SECTIONS.map((section) => {
                const template = templateByKey(templates, section.templateKey);
                if (!template) return null;
                return (
                  <PropertyTemplateEditorCard
                    key={section.templateKey}
                    template={template}
                    icon={section.icon}
                    saving={saveTemplate.isPending}
                    onSave={(input) => handleSave(template.templateKey, input)}
                    onReset={() => void handleReset(template)}
                  />
                );
              })}
            </div>

            <div className="space-y-4">
              <AdminSectionGroupHeading
                title="Email templates"
                count={EMAIL_TEMPLATE_SECTIONS.length}
              />
              {EMAIL_TEMPLATE_SECTIONS.map((section) => {
                const template = templateByKey(templates, section.templateKey);
                if (!template) return null;
                return (
                  <PropertyTemplateEditorCard
                    key={section.templateKey}
                    template={template}
                    icon={section.icon}
                    saving={saveTemplate.isPending}
                    onSave={(input) => handleSave(template.templateKey, input)}
                    onReset={() => void handleReset(template)}
                  />
                );
              })}
            </div>

            {customTemplates.length > 0 ? (
              <div className="space-y-4">
                <AdminSectionGroupHeading title="Custom templates" count={customTemplates.length} />
                {customTemplates.map((template) => (
                  <PropertyTemplateEditorCard
                    key={template.templateKey}
                    template={template}
                    icon={iconForTemplateKey(template.templateKey)}
                    saving={saveTemplate.isPending}
                    onSave={(input) => handleSave(template.templateKey, input)}
                    onDelete={() => void deleteCustomTemplate.mutateAsync(template.templateKey)}
                  />
                ))}
              </div>
            ) : null}

            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <AddCustomTemplateDialog
                  busy={createCustomTemplate.isPending}
                  onAdd={async (name, content) => {
                    await createCustomTemplate.mutateAsync({ name, content });
                  }}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </AdminSectionNavLayout>
    
  );
}
