import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "analytics";

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// In development, reuse the connection across HMR reloads via a global.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

let indexesEnsured = false;

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
  const db = c.db(dbName);
  if (!indexesEnsured) {
    indexesEnsured = true;
    await ensureIndexes(db).catch((err) => {
      indexesEnsured = false;
      console.error("Failed to ensure indexes", err);
    });
  }
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sites").createIndex({ userId: 1 }),
    db.collection("sites").createIndex({ domain: 1 }, { unique: true }),
    db.collection("events").createIndex({ siteId: 1, timestamp: -1 }),
    db.collection("events").createIndex({ siteId: 1, path: 1 }),
    db.collection("events").createIndex({ siteId: 1, referrerSource: 1 }),
    db.collection("events").createIndex({ siteId: 1, sessionId: 1 }),
  ]);
}

export default clientPromise;
