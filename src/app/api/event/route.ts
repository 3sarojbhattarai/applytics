import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { parseUserAgent, referrerSource, visitorHash } from "@/lib/parse";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400, headers: corsHeaders });
  }

  const { domain, url, referrer, screen } = body || {};
  if (!domain || !url) {
    return NextResponse.json({ error: "missing fields" }, { status: 400, headers: corsHeaders });
  }

  const db = await getDb();
  const site = await db.collection("sites").findOne({ domain });
  if (!site) {
    // Unknown domain — accept silently so the script never errors client-side.
    return new NextResponse(null, { status: 202, headers: corsHeaders });
  }

  let path = "/";
  try {
    path = new URL(url).pathname || "/";
  } catch {
    /* keep default */
  }

  const ua = req.headers.get("user-agent") || "";
  const ip = clientIp(req);
  const { browser, os, device } = parseUserAgent(ua);
  const visitorId = visitorHash(String(site._id), ip, ua);
  const now = new Date();

  // Session stitching: reuse the visitor's session if their last event was
  // within the 30-minute window, otherwise start a new session (entry page).
  const recent = await db.collection("events").findOne(
    {
      siteId: site._id,
      visitorId,
      timestamp: { $gte: new Date(now.getTime() - SESSION_WINDOW_MS) },
    },
    { sort: { timestamp: -1 }, projection: { sessionId: 1 } }
  );

  const sessionId = recent?.sessionId || crypto.randomUUID();
  const isEntry = !recent;

  await db.collection("events").insertOne({
    siteId: site._id,
    domain,
    timestamp: now,
    path,
    referrer: referrer || null,
    referrerSource: referrerSource(referrer, domain),
    browser,
    os,
    device,
    country: null,
    screenSize: screen || "",
    visitorId,
    sessionId,
    isEntry,
  });

  return new NextResponse(null, { status: 202, headers: corsHeaders });
}
