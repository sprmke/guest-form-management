import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { ThemePreference } from '@/lib/theme';

type Props = {
  className?: string;
  /** Compact icon-only control for sidebars / headers. */
  variant?: 'icon' | 'segmented';
};

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export function ThemeToggle({ className, variant = 'icon' }: Props) {
  const { theme, setTheme, toggleTheme, resolvedTheme } = useTheme();

  if (variant === 'icon') {
    const isDark = resolvedTheme === 'dark';
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-elevated transition-colors hover:bg-muted hover:text-foreground',
          className,
        )}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? (
          <Sun className="size-4" aria-hidden />
        ) : (
          <Moon className="size-4" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full rounded-xl border border-border bg-muted p-1 shadow-[0_1px_2px_hsl(0_0%_0%_/_0.04)]',
        className,
      )}
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active =
          theme === value ||
          (theme === 'system' && resolvedTheme === value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={label}
            className={cn(
              'flex flex-1 min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors',
              active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
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
