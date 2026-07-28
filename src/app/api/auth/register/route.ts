import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashPassword, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json().catch(() => ({}));

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne({ email: String(email).toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const result = await db.collection("users").insertOne({
    name: name || String(email).split("@")[0],
    email: String(email).toLowerCase(),
    passwordHash,
    createdAt: new Date(),
  });

  await setSessionCookie({
    userId: result.insertedId.toString(),
    email: String(email).toLowerCase(),
    name: name || String(email).split("@")[0],
  });

  return NextResponse.json({ ok: true });
}
