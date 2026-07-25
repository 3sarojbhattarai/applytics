"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Period } from "@/lib/types";
import type { StatsPayload } from "@/lib/stats";
import { formatDuration, formatNumber, formatPercent } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiRow, type KpiItem } from "./kpi-card";
import { VisitorsChart } from "./visitors-chart";
import { BreakdownList } from "./breakdown-list";

interface StatsResponse extends StatsPayload {
  domain: string;
  period: Period;
  currentVisitors: number;
}

const PERIOD_LABELS: Record<Period, string> = {
  day: "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "91d": "Last 91 days",
};

export function SiteDashboard({
  siteId,
  domain,
}: {
  siteId: string;
  domain: string;
}) {
  const [period, setPeriod] = useState<Period>("91d");

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<StatsResponse>({
    // Keyed by siteId + period: switching period starts a fresh query and
    // discards any in-flight response for the old period (no race condition).
    queryKey: ["stats", siteId, period],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/stats/${siteId}?period=${period}`, {
        cache: "no-store",
        signal,
      });
      if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
      return res.json();
    },
    // Keeps "current visitors" live-ish; pauses automatically when the tab
    // is hidden.
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });

  const interval = period === "day" ? "hour" : "day";

  const kpis: KpiItem[] = data
    ? [
        { key: "visitors", label: "Unique Visitors", value: formatNumber(data.kpis.uniqueVisitors) },
        { key: "visits", label: "Total Visits", value: formatNumber(data.kpis.totalVisits) },
        { key: "pageviews", label: "Total Pageviews", value: formatNumber(data.kpis.totalPageviews) },
        { key: "vpv", label: "Views per Visit", value: String(data.kpis.viewsPerVisit) },
        { key: "bounce", label: "Bounce Rate", value: formatPercent(data.kpis.bounceRate) },
        { key: "duration", label: "Visit Duration", value: formatDuration(data.kpis.visitDuration) },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{domain}</h1>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span
                className={`inline-block h-2 w-2 rounded-full bg-green-500 ${
                  isFetching ? "animate-pulse" : ""
                }`}
              />
              {data?.currentVisitors ?? 0} current visitors
            </div>
          </div>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="flex h-96 flex-col items-center justify-center gap-3 text-muted-foreground">
          <p>Couldn&apos;t load stats for this site.</p>
          <button
            onClick={() => refetch()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : isLoading || !data ? (
        <div className="flex h-96 items-center justify-center text-muted-foreground">
          Loading…
        </div>
      ) : (
        <>
          <KpiRow items={kpis} />

          <Card>
            <CardContent className="pt-6">
              <VisitorsChart
                data={data.timeseries}
                interval={interval}
                metricLabel="Unique visitors"
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <Tabs defaultValue="sources">
                  <TabsList>
                    <TabsTrigger value="sources">Sources</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sources" className="mt-4">
                    <BreakdownList
                      items={data.sources}
                      labelHeader="Source"
                      valueHeader="Visitors"
                    />
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <Tabs defaultValue="top">
                  <TabsList>
                    <TabsTrigger value="top">Top Pages</TabsTrigger>
                    <TabsTrigger value="entry">Entry Pages</TabsTrigger>
                    <TabsTrigger value="exit">Exit Pages</TabsTrigger>
                  </TabsList>
                  <TabsContent value="top" className="mt-4">
                    <BreakdownList
                      items={data.topPages}
                      labelHeader="Page"
                      valueHeader="Visitors"
                    />
                  </TabsContent>
                  <TabsContent value="entry" className="mt-4">
                    <BreakdownList
                      items={data.entryPages}
                      labelHeader="Entry page"
                      valueHeader="Unique entrances"
                    />
                  </TabsContent>
                  <TabsContent value="exit" className="mt-4">
                    <BreakdownList
                      items={data.exitPages}
                      labelHeader="Exit page"
                      valueHeader="Visitors"
                    />
                  </TabsContent>
                </Tabs>
              </CardHeader>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
