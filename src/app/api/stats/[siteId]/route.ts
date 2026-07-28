import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getStats, getCurrentVisitors, rangeForPeriod } from "@/lib/stats";
import type { Period } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PERIODS: Period[] = ["day", "7d", "30d", "91d"];

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ObjectId.isValid(params.siteId)) {
    return NextResponse.json({ error: "Invalid site id" }, { status: 400 });
  }
  const siteId = new ObjectId(params.siteId);

  const db = await getDb();
  const site = await db
    .collection("sites")
    .findOne({ _id: siteId, userId: new ObjectId(session.userId) });
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const periodParam = req.nextUrl.searchParams.get("period") as Period | null;
  const period: Period =
    periodParam && VALID_PERIODS.includes(periodParam) ? periodParam : "91d";

  const range = rangeForPeriod(period);
  const [stats, currentVisitors] = await Promise.all([
    getStats(siteId, range),
    getCurrentVisitors(siteId),
  ]);

  return NextResponse.json({
    domain: site.domain,
    period,
    currentVisitors,
    ...stats,
  });
}
