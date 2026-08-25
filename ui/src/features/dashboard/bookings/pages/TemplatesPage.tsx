import * as React from 'react';

import { ClipboardList, Plus } from 'lucide-react';

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
import { TierBadge } from '@/features/dashboard/plans/components/TierBadge';

import { AdminMobilePage } from '@/components/mobile/MobileBrandHero';
import { MobileHeroActionButton } from '@/components/mobile/MobileHeroActionButton';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function TemplatesGroupHeadingSkeleton({ titleWidthClass }: { titleWidthClass: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Skeleton className={cn('h-5', titleWidthClass)} />
        <Skeleton className="h-[22px] w-7 rounded-full" />
      </div>
    </div>
  );
}

function TemplateEditorCardSkeleton() {
  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="bg-muted/30 border-b p-4">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-4">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    </div>
  );
}

function TemplatesPageSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4" aria-busy="true" aria-label="Loading templates">
      <div className="space-y-4">
        <TemplatesGroupHeadingSkeleton titleWidthClass="w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <TemplateEditorCardSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-4">
        <TemplatesGroupHeadingSkeleton titleWidthClass="w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <TemplateEditorCardSkeleton key={i} />
        ))}
      </div>
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
  const { saveTemplate, resetTemplate, createCustomTemplate, deleteCustomTemplate } =
    usePropertyTemplateMutations();
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
    await resetTemplate.mutateAsync(template.templateKey);
  };

  const addTemplateTrigger = (
    <MobileHeroActionButton aria-label="Add custom template">
      <Plus className="size-5" aria-hidden />
    </MobileHeroActionButton>
  );

  return (
    <AdminMobilePage
      title="Templates"
      subtitle="Manage your property's house rules, instructions, and email templates."
      titleId="templates-heading"
      heroTrailing={
        <AddCustomTemplateDialog
          busy={createCustomTemplate.isPending}
          trigger={addTemplateTrigger}
          onAdd={async (name, content) => {
            await createCustomTemplate.mutateAsync({ name, content });
          }}
        />
      }
      desktopActions={
        <AddCustomTemplateDialog
          busy={createCustomTemplate.isPending}
          onAdd={async (name, content) => {
            await createCustomTemplate.mutateAsync({ name, content });
          }}
        />
      }
    >
      <AdminSectionNavLayout className="min-h-0 flex-1" sectionGroups={sectionGroups}>
        {isLoading ? <TemplatesPageSkeleton /> : null}
        {error ? <p className="text-destructive text-sm">Failed to load templates.</p> : null}

        {templates ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-4">
              <AdminSectionGroupHeading
                title="Standard templates"
                count={STANDARD_TEMPLATE_SECTIONS.length}
              />
              {STANDARD_TEMPLATE_SECTIONS.map((section) => {
                const template = templateByKey(templates, section.templateKey);
                if (!template) return null;
                return (
                  <PropertyTemplateEditorCard
                    key={section.templateKey}
                    template={template}
                    icon={section.icon}
                    saving={saveTemplate.isPending || resetTemplate.isPending}
                    showSectionImage={false}
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
                badge={<TierBadge feature="customTemplates" />}
              />
              {EMAIL_TEMPLATE_SECTIONS.map((section) => {
                const template = templateByKey(templates, section.templateKey);
                if (!template) return null;
                return (
                  <PropertyTemplateEditorCard
                    key={section.templateKey}
                    template={template}
                    icon={section.icon}
                    saving={saveTemplate.isPending || resetTemplate.isPending}
                    onSave={(input) => handleSave(template.templateKey, input)}
                    onReset={() => void handleReset(template)}
                  />
                );
              })}
            </div>

            {customTemplates.length > 0 ? (
              <div className="space-y-4">
                <AdminSectionGroupHeading
                  title="Custom templates"
                  count={customTemplates.length}
                  badge={<TierBadge feature="customTemplates" />}
                />
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
    </AdminMobilePage>
  );
}
