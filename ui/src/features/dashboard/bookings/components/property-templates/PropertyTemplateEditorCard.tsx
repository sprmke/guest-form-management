import * as React from 'react';

import { Braces, Eye, Mail, Pencil, RotateCcw, Save, Trash2 } from 'lucide-react';

import { extractLeadingSectionHeading } from '@/features/guest/stay-guide/lib/stayGuideContent';

import { PropertyTemplatePlaceholdersDialog } from '@/features/dashboard/bookings/components/property-templates/PropertyTemplatePlaceholdersDialog';
import {
  RichTextDisplay,
  RichTextEditor,
  type RichTextEditorHandle,
} from '@/features/dashboard/bookings/components/property-templates/RichTextEditor';
import { TemplateSectionImageField } from '@/features/dashboard/bookings/components/property-templates/TemplateSectionImageField';
import {
  usePropertyTemplatePreview,
  type PropertyTemplateDto,
} from '@/features/dashboard/bookings/hooks/usePropertyTemplates';
import { useUploadPropertyTemplateAsset } from '@/features/dashboard/bookings/hooks/useUploadPropertyTemplateAsset';
import { normalizeBlockLevelPlaceholdersInHtml } from '@/features/dashboard/bookings/lib/normalizeBlockLevelPlaceholders';
import { normalizeEmailCalloutPlaceholders } from '@/features/dashboard/bookings/lib/normalizeEmailCalloutPlaceholders';
import {
  applyPropertyTemplatePlaceholders,
  PROPERTY_TEMPLATE_SAMPLE_VARS,
} from '@/features/dashboard/bookings/lib/propertyTemplatePlaceholders';
import { withStorageUrlCacheBust } from '@/features/dashboard/bookings/lib/storageUrls';
import { buildValidPlaceholderKeySet } from '@/features/dashboard/bookings/lib/telegramPlaceholderGroups';
import { propertyPlaceholderLinesForTemplate } from '@/features/dashboard/bookings/lib/templatePlaceholderCatalog';
import {
  attachTemplatePreviewActionBlocker,
  blockTemplatePreviewAction,
  blockTemplatePreviewKeydown,
} from '@/features/dashboard/bookings/lib/templatePreviewReadonly';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/ui/sliding-tabs';
import { cn } from '@/lib/utils';

type EditorTab = 'edit' | 'preview';

const EDITOR_VIEW_OPTIONS = [
  { value: 'edit' as const, label: 'Edit', icon: Pencil },
  { value: 'preview' as const, label: 'Preview', icon: Eye },
];

type Props = {
  template: PropertyTemplateDto;
  icon: React.ComponentType<{ className?: string }>;
  onSave: (input: { content: string; sectionImageUrl?: string | null }) => Promise<void>;
  onReset?: () => void;
  onDelete?: () => void;
  saving?: boolean;
};

export function PropertyTemplateEditorCard({
  template,
  icon: Icon,
  onSave,
  onReset,
  onDelete,
  saving,
}: Props) {
  const [content, setContent] = React.useState(template.content);
  const [sectionImageUrl, setSectionImageUrl] = React.useState(template.sectionImageUrl);
  const [sectionImagePreviewBust, setSectionImagePreviewBust] = React.useState(() =>
    template.updatedAt ? Date.parse(template.updatedAt) || 0 : 0
  );
  const [activeTab, setActiveTab] = React.useState<EditorTab>('edit');
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [placeholdersOpen, setPlaceholdersOpen] = React.useState(false);
  const editorRef = React.useRef<RichTextEditorHandle>(null);
  const previewIframeRef = React.useRef<HTMLIFrameElement>(null);
  const { mutateAsync: fetchPreview, isPending: previewPending } = usePropertyTemplatePreview();

  React.useEffect(() => {
    let next = normalizeBlockLevelPlaceholdersInHtml(template.content);
    if (template.category === 'email') {
      next = normalizeEmailCalloutPlaceholders(next, template.templateKey, {
        ensureMissing: true,
      });
    }
    setContent(next);
    setSectionImageUrl(template.sectionImageUrl);
    setSectionImagePreviewBust(template.updatedAt ? Date.parse(template.updatedAt) || 0 : 0);
  }, [
    template.content,
    template.templateKey,
    template.category,
    template.sectionImageUrl,
    template.updatedAt,
  ]);

  const handleSectionImageUrlChange = React.useCallback((url: string | null) => {
    setSectionImageUrl(url);
    setSectionImagePreviewBust(url ? Date.now() : 0);
  }, []);

  const sectionImageDisplayUrl = sectionImageUrl
    ? withStorageUrlCacheBust(sectionImageUrl, sectionImagePreviewBust || null)
    : null;

  const hasChanges = content !== template.content || sectionImageUrl !== template.sectionImageUrl;
  const isEmail = template.category === 'email';
  const isCustom = template.category === 'custom';
  const isStandard = template.category === 'standard';
  const uploadTemplateAsset = useUploadPropertyTemplateAsset();

  const placeholderLines = React.useMemo(
    () => propertyPlaceholderLinesForTemplate(template.templateKey, template.category),
    [template.templateKey, template.category]
  );

  const validPlaceholderKeys = React.useMemo(
    () => buildValidPlaceholderKeySet(placeholderLines),
    [placeholderLines]
  );

  const previewContent = React.useMemo(() => applyPropertyTemplatePlaceholders(content), [content]);
  const previewHeading = React.useMemo(() => {
    const { heading } = extractLeadingSectionHeading(previewContent);
    return heading || template.name;
  }, [previewContent, template.name]);
  const previewBody = React.useMemo(() => {
    const { heading, bodyHtml } = extractLeadingSectionHeading(previewContent);
    return heading ? bodyHtml : previewContent;
  }, [previewContent]);

  const handleInlineImageUpload = React.useCallback(
    async (file: File) => {
      const result = await uploadTemplateAsset.mutateAsync({
        assetType: 'inline_image',
        file,
      });
      return result.url;
    },
    [uploadTemplateAsset]
  );

  const handleInsertPlaceholder = React.useCallback(
    (token: string) => {
      if (activeTab !== 'edit') {
        setActiveTab('edit');
      }
      window.setTimeout(() => {
        editorRef.current?.insertToken(token);
      }, 0);
    },
    [activeTab]
  );

  const loadPreview = React.useCallback(async () => {
    if (!isEmail) return;
    setPreviewHtml(null);
    try {
      const result = await fetchPreview({
        templateKey: template.templateKey,
        category: template.category,
        content,
        name: template.name,
      });
      setPreviewHtml(result.html);
    } catch {
      setPreviewHtml(null);
    }
  }, [content, fetchPreview, isEmail, template.category, template.name, template.templateKey]);

  React.useEffect(() => {
    if (activeTab !== 'preview' || !isEmail || !previewHtml) return;

    const iframe = previewIframeRef.current;
    if (!iframe) return;

    let detach: (() => void) | undefined;

    const bind = () => {
      detach?.();
      const doc = iframe.contentDocument;
      if (!doc) return;
      detach = attachTemplatePreviewActionBlocker(doc);
    };

    iframe.addEventListener('load', bind);
    bind();

    return () => {
      iframe.removeEventListener('load', bind);
      detach?.();
    };
  }, [activeTab, isEmail, previewHtml]);

  const handlePreviewCapture = React.useCallback((event: React.SyntheticEvent) => {
    blockTemplatePreviewAction(event.nativeEvent);
  }, []);

  const handlePreviewKeyCapture = React.useCallback((event: React.KeyboardEvent) => {
    blockTemplatePreviewKeydown(event.nativeEvent);
  }, []);

  const handleTabChange = (tab: EditorTab) => {
    setActiveTab(tab);
    if (tab === 'preview') {
      if (isEmail) void loadPreview();
    } else {
      setPreviewHtml(null);
    }
  };

  return (
    <Card id={`section-${template.templateKey}`} className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              isEmail ? 'bg-blue-500/10' : 'bg-primary/10'
            )}
          >
            <Icon className={cn('h-5 w-5', isEmail ? 'text-blue-600' : 'text-primary')} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {isEmail ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Mail className="h-3 w-3" aria-hidden />
                  Email
                </span>
              ) : null}
              {hasChanges ? (
                <span className="inline-flex items-center rounded-md border border-amber-500/50 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  Unsaved
                </span>
              ) : null}
            </div>
            <CardDescription className="text-sm">
              {template.description ?? (isCustom ? 'Custom template for your property.' : null)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-4">
          <SegmentedControl
            value={activeTab}
            onChange={handleTabChange}
            options={EDITOR_VIEW_OPTIONS}
            size="dense"
            aria-label={`${template.name} view`}
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-1.5 sm:min-h-9"
              onClick={() => setPlaceholdersOpen(true)}
            >
              <Braces className="size-4 shrink-0" aria-hidden />
              Placeholders
            </Button>
            {!isCustom && onReset ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] gap-1.5 sm:min-h-9"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="size-4 shrink-0" aria-hidden />
                Reset
              </Button>
            ) : null}
            {isCustom && onDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 min-h-[44px] gap-1.5 sm:min-h-9"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4 shrink-0" aria-hidden />
                Delete
              </Button>
            ) : null}
            {hasChanges ? (
              <Button
                type="button"
                size="sm"
                className="min-h-[44px] sm:min-h-9"
                disabled={saving}
                onClick={() => void onSave({ content, sectionImageUrl })}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          {activeTab === 'preview' ? (
            isEmail ? (
              previewPending || !previewHtml ? (
                <div className="bg-muted/20 text-muted-foreground flex min-h-[280px] items-center justify-center rounded-lg border text-sm">
                  Loading preview…
                </div>
              ) : (
                <div className="bg-muted/20 overflow-x-auto rounded-lg border">
                  <iframe
                    ref={previewIframeRef}
                    title={`${template.name} preview`}
                    srcDoc={previewHtml}
                    className="h-[min(70dvh,640px)] w-full min-w-[320px] border-0 bg-white"
                    sandbox=""
                  />
                </div>
              )
            ) : (
              <div
                onClickCapture={handlePreviewCapture}
                onKeyDownCapture={handlePreviewKeyCapture}
                className={cn(
                  'border-border bg-card overflow-hidden rounded-lg border shadow-sm',
                  isStandard && sectionImageDisplayUrl && 'lg:grid lg:grid-cols-2 lg:items-stretch'
                )}
              >
                {isStandard && sectionImageDisplayUrl ? (
                  <div className="relative aspect-[16/10] w-full shrink-0 lg:aspect-auto lg:h-full lg:min-h-[240px]">
                    <img
                      key={sectionImagePreviewBust || sectionImageUrl}
                      src={sectionImageDisplayUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-col justify-center p-4 sm:p-6">
                  <h3 className="text-primary mb-4 text-xl font-bold tracking-tight sm:text-2xl">
                    {previewHeading}
                  </h3>
                  <RichTextDisplay
                    content={previewBody}
                    className="px-0 py-0"
                    validPlaceholderKeys={validPlaceholderKeys}
                  />
                </div>
              </div>
            )
          ) : (
            <>
              {isStandard ? (
                <TemplateSectionImageField
                  templateKey={template.templateKey}
                  imageUrl={sectionImageUrl}
                  previewBust={sectionImagePreviewBust}
                  disabled={saving}
                  onImageUrlChange={handleSectionImageUrlChange}
                />
              ) : null}
              <RichTextEditor
                ref={editorRef}
                content={content}
                onChange={setContent}
                minHeight="280px"
                validPlaceholderKeys={validPlaceholderKeys}
                onImageUpload={isStandard ? handleInlineImageUpload : undefined}
              />
            </>
          )}
        </div>

        <PropertyTemplatePlaceholdersDialog
          open={placeholdersOpen}
          onOpenChange={setPlaceholdersOpen}
          lines={placeholderLines}
          sampleVars={PROPERTY_TEMPLATE_SAMPLE_VARS}
          onInsertToken={handleInsertPlaceholder}
        />
      </CardContent>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open);
          if (!open) {
            window.requestAnimationFrame(() => {
              document.body.style.removeProperty('pointer-events');
            });
          }
        }}
      >
        <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <DialogHeader>
            <DialogTitle>Reset template content to default?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-1">
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setResetOpen(false);
                setContent(template.defaultContent);
                handleSectionImageUrlChange(null);
                void onReset?.();
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            window.requestAnimationFrame(() => {
              document.body.style.removeProperty('pointer-events');
            });
          }
        }}
      >
        <DialogContent className="max-w-[min(calc(100vw-1.5rem),28rem)]">
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-1">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false);
                void onDelete?.();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
