/**
 * Seed synthetic analytics data for local development.
 *
 * Usage:
 *   npm run seed                       # seeds domain "demo.localhost"
 *   npm run seed -- mysite.com 20000   # custom domain + event count
 *
 * Reads MONGODB_URI / MONGODB_DB from .env.local.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";

// Minimal .env.local loader (avoids extra deps).
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env.local — rely on process env */
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB || "analytics";

const domain = process.argv[2] || "demo.localhost";
const totalEvents = parseInt(process.argv[3] || "15000", 10);
const DAYS = 91;

const PATHS = [
  "/", "/:dashboard", "/sites", "/login", "/share/:dashboard",
  "/plausible.io", "/:dashboard/pages", "/pricing", "/docs", "/blog",
];
const SOURCES = [
  "Direct / None", "Direct / None", "Direct / None", "Google", "Google",
  "ChatGPT", "GitHub", "DuckDuckGo", "Bing", "Brave", "Twitter", "Reddit",
];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"];
const OSES = ["Mac OS", "Windows", "iOS", "Android", "Linux"];
const DEVICES = ["Desktop", "Mobile", "Tablet"];
const SCREENS = ["1920x1080", "1440x900", "390x844", "768x1024"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // Ensure a demo user + site exist so the seeded data is viewable.
  let user = await db.collection("users").findOne({ email: "demo@analytica.dev" });
  if (!user) {
    const passwordHash = await bcrypt.hash("password123", 10);
    const r = await db.collection("users").insertOne({
      name: "Demo User",
      email: "demo@analytica.dev",
      passwordHash,
      createdAt: new Date(),
    });
    user = await db.collection("users").findOne({ _id: r.insertedId });
    console.log("Created demo user: demo@analytica.dev / password123");
  }

  let site = await db.collection("sites").findOne({ domain });
  if (!site) {
    const r = await db.collection("sites").insertOne({
      userId: user!._id,
      domain,
      createdAt: new Date(),
    });
    site = await db.collection("sites").findOne({ _id: r.insertedId });
  }
  const siteId = site!._id as ObjectId;

  // Clear existing events for a clean seed.
  await db.collection("events").deleteMany({ siteId });

  const now = Date.now();
  const docs: any[] = [];

  // Build sessions: each session = 1-6 pageviews from one visitor.
  let created = 0;
  while (created < totalEvents) {
    // Weight recent days a bit heavier + weekday seasonality.
    const dayOffset = Math.floor(Math.random() * DAYS);
    const dayStart = now - dayOffset * 24 * 60 * 60 * 1000;
    const hour = 6 + Math.floor(Math.random() * 15); // daytime
    const sessionStart = new Date(dayStart);
    sessionStart.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

    const visitorId = crypto.randomBytes(16).toString("hex");
    const sessionId = crypto.randomUUID();
    const source = pick(SOURCES);
    const browser = pick(BROWSERS);
    const os = pick(OSES);
    const device = pick(DEVICES);
    const screen = pick(SCREENS);

    const pageCount = 1 + Math.floor(Math.random() * 6);
    for (let p = 0; p < pageCount && created < totalEvents; p++) {
      const ts = new Date(sessionStart.getTime() + p * (30_000 + Math.random() * 120_000));
      docs.push({
        siteId,
        domain,
        timestamp: ts,
        path: pick(PATHS),
        referrer: source === "Direct / None" ? null : `https://${source.toLowerCase()}.com/`,
        referrerSource: source,
        browser,
        os,
        device,
        country: null,
        screenSize: screen,
        visitorId,
        sessionId,
        isEntry: p === 0,
      });
      created++;
    }

    if (docs.length >= 2000) {
      await db.collection("events").insertMany(docs);
      docs.length = 0;
      process.stdout.write(`\rInserted ${created}/${totalEvents}`);
    }
  }
  if (docs.length) await db.collection("events").insertMany(docs);

  console.log(`\nSeeded ${created} events for "${domain}".`);
  console.log(`View at: /dashboard/${siteId.toString()}`);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
