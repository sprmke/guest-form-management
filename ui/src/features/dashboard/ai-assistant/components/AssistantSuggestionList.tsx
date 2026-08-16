import { HelpCircle, Zap } from 'lucide-react';

import type { AssistantSuggestion } from '@/features/dashboard/ai-assistant/lib/assistantSuggestions';

import { cn } from '@/lib/utils';

type Props = {
  suggestions: AssistantSuggestion[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
};

export function AssistantSuggestionList({ suggestions, onPick, disabled }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {suggestions.map((item, index) => {
        const Icon = item.kind === 'action' ? Zap : HelpCircle;
        return (
          <li
            key={item.id}
            className="motion-safe:animate-[slideUp_0.38s_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(item.prompt)}
              className={cn(
                'surface-card-interactive native-press focus-visible:ring-ring flex min-h-[44px] w-full items-center gap-3 px-3 py-3 text-left text-sm',
                'focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              <span className="bg-primary/12 text-primary mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-pretty leading-snug [overflow-wrap:anywhere]">
                {item.prompt}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
