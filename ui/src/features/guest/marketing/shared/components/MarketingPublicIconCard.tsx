import type { LucideIcon } from 'lucide-react';

interface MarketingPublicIconCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  href?: string;
  action?: string;
}

export function MarketingPublicIconCard({
  icon: Icon,
  title,
  body,
  href,
  action,
}: MarketingPublicIconCardProps) {
  return (
    <article className="border-border bg-card flex h-full flex-col rounded-2xl border p-6 sm:p-7">
      <div className="bg-primary/10 text-primary mb-4 flex h-11 w-11 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-foreground text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">{body}</p>
      {href && action ? (
        <a
          href={href}
          className="text-primary mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold hover:underline"
        >
          {action}
        </a>
      ) : null}
    </article>
  );
}
