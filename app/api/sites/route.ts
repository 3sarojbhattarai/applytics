import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const sites = await db
    .collection("sites")
    .find({ userId: new ObjectId(session.userId) })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({
    sites: sites.map((s) => ({
      id: s._id.toString(),
      domain: s.domain,
      createdAt: s.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domain } = await req.json().catch(() => ({}));
  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  const cleaned = String(domain)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");

  const db = await getDb();
  const existing = await db.collection("sites").findOne({ domain: cleaned });
  if (existing) {
    return NextResponse.json({ error: "This domain is already registered" }, { status: 409 });
  }

  const result = await db.collection("sites").insertOne({
    userId: new ObjectId(session.userId),
    domain: cleaned,
    createdAt: new Date(),
  });

  return NextResponse.json({ id: result.insertedId.toString(), domain: cleaned });
}
