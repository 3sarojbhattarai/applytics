export interface KpiItem {
  key: string;
  label: string;
  value: string;
}

export function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
      {items.map((item, i) => (
        <div
          key={item.key}
          className={`flex flex-col items-start gap-1 px-5 py-4 ${
            i === 0 ? "bg-primary/5" : ""
          }`}
        >
          <span
            className={`text-xs font-medium uppercase tracking-wide ${
              i === 0 ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {item.label}
          </span>
          <span className="text-2xl font-bold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
