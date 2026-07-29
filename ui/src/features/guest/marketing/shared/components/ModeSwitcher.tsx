import { useLocation } from 'react-router-dom';

import { Building2, Compass } from 'lucide-react';

import { getAppModeFromPath, type AppMode } from '@/features/guest/auth/config/mode-switch';
import { useModeSwitchTransition } from '@/features/guest/marketing/shared/context/ModeSwitchTransitionContext';

import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  collapsed?: boolean;
};

const MODES: Array<{
  value: AppMode;
  label: string;
  Icon: typeof Compass;
}> = [
  { value: 'guest', label: 'Explore', Icon: Compass },
  { value: 'host', label: 'Host', Icon: Building2 },
];

export function ModeSwitcher({ className, collapsed = false }: Props) {
  const { pathname } = useLocation();
  const mode = getAppModeFromPath(pathname);
  const { switchMode, isTransitioning } = useModeSwitchTransition();

  const switchTo = (target: AppMode) => {
    if (target === mode || isTransitioning) return;
    switchMode(target);
  };

  if (collapsed) {
    const other = MODES.find((m) => m.value !== mode) ?? MODES[1]!;
    const OtherIcon = other.Icon;
    return (
      <button
        type="button"
        onClick={() => switchTo(other.value)}
        disabled={isTransitioning}
        className={cn(
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-60',
          className
        )}
        aria-label={`Switch to ${other.label}`}
        title={`Switch to ${other.label}`}
      >
        <OtherIcon className="size-5 shrink-0" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'border-border bg-muted flex w-full rounded-xl border p-1 shadow-[0_1px_2px_hsl(0_0%_0%_/_0.04)]',
        className
      )}
      role="group"
      aria-label="App mode"
    >
      {MODES.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => switchTo(value)}
            disabled={isTransitioning}
            aria-pressed={active}
            aria-label={label}
            className={cn(
              'flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={label}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
