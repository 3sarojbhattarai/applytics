import { formatNumber } from "@/lib/utils";
import type { NameCount } from "@/lib/stats";

export function BreakdownList({
  items,
  labelHeader,
  valueHeader,
}: {
  items: NameCount[];
  labelHeader: string;
  valueHeader: string;
}) {
  const max = items.reduce((m, i) => Math.max(m, i.visitors), 0) || 1;

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No data for this period
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-1 text-xs text-muted-foreground">
        <span>{labelHeader}</span>
        <span>{valueHeader}</span>
      </div>
      {items.map((item) => (
        <div
          key={item.name}
          className="relative flex items-center justify-between overflow-hidden rounded-md px-2 py-1.5 text-sm"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
            style={{ width: `${(item.visitors / max) * 100}%` }}
            aria-hidden
          />
          <span className="relative z-10 truncate pr-4">{item.name}</span>
          <span className="relative z-10 font-medium tabular-nums">
            {formatNumber(item.visitors)}
          </span>
        </div>
      ))}
    </div>
  );
}
