"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeseriesPoint } from "@/lib/stats";
import { formatNumber } from "@/lib/utils";

interface Props {
  data: TimeseriesPoint[];
  interval: "hour" | "day";
  metricLabel: string;
}

function formatTick(iso: string, interval: "hour" | "day"): string {
  const d = new Date(iso);
  if (interval === "hour") {
    return d.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function TooltipContent({
  active,
  payload,
  interval,
  metricLabel,
}: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload as TimeseriesPoint;
  const d = new Date(point.date);
  const label =
    interval === "hour"
      ? d.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
        })
      : d.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-medium">{label}</div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-primary" />
        <span className="text-muted-foreground">{metricLabel}</span>
        <span className="ml-auto font-semibold tabular-nums">
          {point.visitors.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function VisitorsChart({ data, interval, metricLabel }: Props) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="hsl(var(--border))"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatTick(v, interval)}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            width={48}
            tickFormatter={(v) => formatNumber(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            content={
              <TooltipContent interval={interval} metricLabel={metricLabel} />
            }
            cursor={{ stroke: "hsl(var(--chart-1))", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#visitorsFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
