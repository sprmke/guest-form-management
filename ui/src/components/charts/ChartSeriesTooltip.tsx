type TooltipEntry = {
  value: number;
  name: string;
  color: string;
  formattedValue?: string;
};

type Props = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  formatValue?: (value: number) => string;
};

export function ChartSeriesTooltip({
  active,
  payload,
  label,
  formatValue = (value) => String(value),
}: Props) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-xs shadow-elevated">
      {label ? <p className="font-semibold text-foreground">{label}</p> : null}
      <div className={label ? "mt-1.5 space-y-1" : "space-y-1"}>
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize text-muted-foreground">
                {entry.name}
              </span>
            </div>
            <span className="font-semibold tabular-nums text-foreground">
              {entry.formattedValue ?? formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
