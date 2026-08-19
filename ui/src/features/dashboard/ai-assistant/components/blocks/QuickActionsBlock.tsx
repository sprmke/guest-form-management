type Props = {
  actions: Array<{ label: string; prompt: string }>;
  onFillComposer?: (prompt: string) => void;
};

export function QuickActionsBlock({ actions, onFillComposer }: Props) {
  const visible = (actions ?? []).filter((action) => action.label?.trim() && action.prompt?.trim());
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested messages">
      {visible.map((action) => (
        <button
          key={`${action.label}-${action.prompt}`}
          type="button"
          onClick={() => onFillComposer?.(action.prompt)}
          className="native-press border-border/60 bg-card text-foreground focus-visible:ring-ring min-h-[44px] rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
