import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { Period } from "./types";

export interface DateRange {
  from: Date;
  to: Date;
  interval: "hour" | "day";
}

export function rangeForPeriod(period: Period, now = new Date()): DateRange {
  const to = now;
  const from = new Date(now);
  switch (period) {
    case "day":
      from.setHours(from.getHours() - 24);
      return { from, to, interval: "hour" };
    case "7d":
      from.setDate(from.getDate() - 7);
      return { from, to, interval: "day" };
    case "30d":
      from.setDate(from.getDate() - 30);
      return { from, to, interval: "day" };
    case "91d":
    default:
      from.setDate(from.getDate() - 91);
      return { from, to, interval: "day" };
  }
}

export interface TimeseriesPoint {
  date: string;
  visitors: number;
}

export interface NameCount {
  name: string;
  visitors: number;
}

export interface Kpis {
  uniqueVisitors: number;
  totalVisits: number;
  totalPageviews: number;
  viewsPerVisit: number;
  bounceRate: number;
  visitDuration: number;
}

export interface StatsPayload {
  kpis: Kpis;
  timeseries: TimeseriesPoint[];
  sources: NameCount[];
  topPages: NameCount[];
  entryPages: NameCount[];
  exitPages: NameCount[];
}

function baseMatch(siteId: ObjectId, from: Date, to: Date) {
  return { siteId, timestamp: { $gte: from, $lte: to } };
}

export async function getKpis(
  siteId: ObjectId,
  from: Date,
  to: Date
): Promise<Kpis> {
  const db = await getDb();
  const events = db.collection("events");

  const match = baseMatch(siteId, from, to);

  const [totals] = await events
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          pageviews: { $sum: 1 },
          visitors: { $addToSet: "$visitorId" },
          sessions: { $addToSet: "$sessionId" },
        },
      },
      {
        $project: {
          pageviews: 1,
          uniqueVisitors: { $size: "$visitors" },
          totalVisits: { $size: "$sessions" },
        },
      },
    ])
    .toArray();

  // Per-session aggregates for bounce rate and visit duration.
  const [sessionStats] = await events
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: "$sessionId",
          count: { $sum: 1 },
          first: { $min: "$timestamp" },
          last: { $max: "$timestamp" },
        },
      },
      {
        $group: {
          _id: null,
          sessions: { $sum: 1 },
          bounces: { $sum: { $cond: [{ $eq: ["$count", 1] }, 1, 0] } },
          totalDuration: {
            $sum: { $divide: [{ $subtract: ["$last", "$first"] }, 1000] },
          },
        },
      },
    ])
    .toArray();

  const pageviews = totals?.pageviews ?? 0;
  const uniqueVisitors = totals?.uniqueVisitors ?? 0;
  const totalVisits = totals?.totalVisits ?? 0;
  const sessions = sessionStats?.sessions ?? 0;
  const bounces = sessionStats?.bounces ?? 0;
  const totalDuration = sessionStats?.totalDuration ?? 0;

  return {
    uniqueVisitors,
    totalVisits,
    totalPageviews: pageviews,
    viewsPerVisit: totalVisits ? +(pageviews / totalVisits).toFixed(2) : 0,
    bounceRate: sessions ? Math.round((bounces / sessions) * 100) : 0,
    visitDuration: sessions ? Math.round(totalDuration / sessions) : 0,
  };
}

export async function getTimeseries(
  siteId: ObjectId,
  from: Date,
  to: Date,
  interval: "hour" | "day"
): Promise<TimeseriesPoint[]> {
  const db = await getDb();
  const rows = await db
    .collection("events")
    .aggregate([
      { $match: baseMatch(siteId, from, to) },
      {
        $group: {
          _id: {
            bucket: { $dateTrunc: { date: "$timestamp", unit: interval } },
            visitorId: "$visitorId",
          },
        },
      },
      {
        $group: {
          _id: "$_id.bucket",
          visitors: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", visitors: 1 } },
    ])
    .toArray();

  return fillGaps(
    rows.map((r) => ({ date: (r.date as Date).toISOString(), visitors: r.visitors as number })),
    from,
    to,
    interval
  );
}

function fillGaps(
  points: TimeseriesPoint[],
  from: Date,
  to: Date,
  interval: "hour" | "day"
): TimeseriesPoint[] {
  const map = new Map(
    points.map((p) => [truncateISO(new Date(p.date), interval), p.visitors])
  );
  const result: TimeseriesPoint[] = [];
  const cursor = new Date(from);
  if (interval === "hour") cursor.setMinutes(0, 0, 0);
  else cursor.setHours(0, 0, 0, 0);

  while (cursor <= to) {
    const key = truncateISO(cursor, interval);
    result.push({ date: cursor.toISOString(), visitors: map.get(key) ?? 0 });
    if (interval === "hour") cursor.setHours(cursor.getHours() + 1);
    else cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function truncateISO(d: Date, interval: "hour" | "day"): string {
  const c = new Date(d);
  if (interval === "hour") c.setMinutes(0, 0, 0);
  else c.setUTCHours(0, 0, 0, 0);
  return c.toISOString();
}

async function groupByField(
  siteId: ObjectId,
  from: Date,
  to: Date,
  field: string,
  extraMatch: Record<string, unknown> = {},
  limit = 9
): Promise<NameCount[]> {
  const db = await getDb();
  const rows = await db
    .collection("events")
    .aggregate([
      { $match: { ...baseMatch(siteId, from, to), ...extraMatch } },
      {
        $group: {
          _id: `$${field}`,
          visitors: { $addToSet: "$visitorId" },
        },
      },
      { $project: { name: "$_id", visitors: { $size: "$visitors" }, _id: 0 } },
      { $sort: { visitors: -1 } },
      { $limit: limit },
    ])
    .toArray();
  return rows.map((r) => ({ name: (r.name as string) || "(none)", visitors: r.visitors as number }));
}

export async function getSources(siteId: ObjectId, from: Date, to: Date) {
  return groupByField(siteId, from, to, "referrerSource");
}

export async function getTopPages(siteId: ObjectId, from: Date, to: Date) {
  return groupByField(siteId, from, to, "path");
}

export async function getEntryPages(siteId: ObjectId, from: Date, to: Date) {
  return groupByField(siteId, from, to, "path", { isEntry: true });
}

export async function getExitPages(
  siteId: ObjectId,
  from: Date,
  to: Date
): Promise<NameCount[]> {
  const db = await getDb();
  // Exit page = the last event (by timestamp) of each session.
  const rows = await db
    .collection("events")
    .aggregate([
      { $match: baseMatch(siteId, from, to) },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: "$sessionId",
          path: { $last: "$path" },
          visitorId: { $last: "$visitorId" },
        },
      },
      {
        $group: {
          _id: "$path",
          visitors: { $addToSet: "$visitorId" },
        },
      },
      { $project: { name: "$_id", visitors: { $size: "$visitors" }, _id: 0 } },
      { $sort: { visitors: -1 } },
      { $limit: 9 },
    ])
    .toArray();
  return rows.map((r) => ({ name: (r.name as string) || "(none)", visitors: r.visitors as number }));
}

export async function getCurrentVisitors(siteId: ObjectId): Promise<number> {
  const db = await getDb();
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await db
    .collection("events")
    .aggregate([
      { $match: { siteId, timestamp: { $gte: since } } },
      { $group: { _id: "$visitorId" } },
      { $count: "count" },
    ])
    .toArray();
  return rows[0]?.count ?? 0;
}

export async function getStats(
  siteId: ObjectId,
  range: DateRange
): Promise<StatsPayload> {
  const { from, to, interval } = range;
  const [kpis, timeseries, sources, topPages, entryPages, exitPages] =
    await Promise.all([
      getKpis(siteId, from, to),
      getTimeseries(siteId, from, to, interval),
      getSources(siteId, from, to),
      getTopPages(siteId, from, to),
      getEntryPages(siteId, from, to),
      getExitPages(siteId, from, to),
    ]);
  return { kpis, timeseries, sources, topPages, entryPages, exitPages };
}
