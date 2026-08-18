import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { absoluteGuestPath } from '@/features/guest/lib/guestPublicPaths';
import { withGuestEmbedPreviewUrl } from '@/features/guest/lib/guestEmbedPreview';
import { PublicPageLivePreview } from '@/features/dashboard/custom-pages/components/PublicPageLivePreview';
import type { PropertyGuestPublicPage } from '@/features/dashboard/property/lib/propertyGuestPublicPages';

import { Button } from '@/components/ui/button';

type Props = {
  page: PropertyGuestPublicPage;
  propertyName: string;
  coverUrl: string | null;
};

async function copyPublicPageLink(href: string, label: string) {
  try {
    await navigator.clipboard.writeText(href);
    toast.success(`${label} link copied`);
  } catch {
    toast.error('Could not copy link');
  }
}

export function PublicPageCard({ page, propertyName, coverUrl }: Props) {
  const Icon = page.icon;
  const href = absoluteGuestPath(page.path);
  const copyHref = absoluteGuestPath(page.copyPath ?? page.path);
  const openHref = page.openUsesEmbed ? withGuestEmbedPreviewUrl(href) : href;
  const previewSrc = withGuestEmbedPreviewUrl(href);

  return (
    <article className="surface-card-interactive native-press group relative flex min-h-[44px] flex-col overflow-hidden">
      <a
        href={openHref}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/10] w-full overflow-hidden sm:aspect-[16/9]"
        aria-label={`Open ${page.label} in a new tab`}
      >
        <PublicPageLivePreview
          src={previewSrc}
          pageId={page.id}
          label={page.label}
          propertyName={propertyName}
          coverUrl={coverUrl}
        />
      </a>

      <div className="flex flex-col gap-2.5 px-3.5 py-3 sm:py-3.5">
        <div className="flex items-start gap-2.5">
          <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-foreground block truncate text-sm font-semibold">
              {page.label}
            </span>
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
              {page.description}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-h-[44px] flex-1 gap-1.5"
            onClick={() => void copyPublicPageLink(copyHref, page.label)}
          >
            <Copy className="size-3.5" aria-hidden />
            Copy link
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-9 min-h-[44px] flex-1 gap-1.5"
            asChild
          >
            <a href={openHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden />
              Open page
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
