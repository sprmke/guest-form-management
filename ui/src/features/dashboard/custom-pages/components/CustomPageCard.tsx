import { BookOpen, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type CustomPageCardProps = {
  title: string;
  description: string;
  previewHref: string | null;
};

export function CustomPageCard({ title, description, previewHref }: CustomPageCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-foreground text-base font-semibold">{title}</h3>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
          </div>
        </div>

        {previewHref ? (
          <Button variant="outline" size="sm" className="min-h-[44px] w-fit" asChild>
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Preview ${title} in a new tab`}
            >
              Preview
              <ExternalLink className="ml-1.5 size-3.5 shrink-0" aria-hidden />
            </a>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
