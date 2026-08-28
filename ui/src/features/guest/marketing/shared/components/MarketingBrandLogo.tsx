import { cn } from '@/lib/utils';

export type MarketingBrandLogoTone = 'default' | 'onPrimary';

export interface MarketingBrandLogoProps {
  className?: string;
  tone?: MarketingBrandLogoTone;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  markClassName?: string;
}

export function MarketingBrandLogo({
  className,
  tone = 'default',
  showWordmark = true,
  wordmarkClassName,
  markClassName,
}: MarketingBrandLogoProps) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'from-primary to-primary/80 shadow-primary/25 relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
          tone === 'onPrimary' && 'ring-2 ring-white/25',
          markClassName
        )}
      >
        <span className="text-xl font-bold text-white">K</span>
        <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {showWordmark ? (
        <span
          className={cn(
            'text-xl font-bold tracking-tight',
            tone === 'onPrimary' ? 'text-white' : 'text-foreground',
            wordmarkClassName
          )}
        >
          {tone === 'onPrimary' ? (
            <>
              Kame<span className="text-white/85">Homes</span>
            </>
          ) : (
            <>
              Kame<span className="text-primary">Homes</span>
            </>
          )}
        </span>
      ) : null}
    </span>
  );
}
