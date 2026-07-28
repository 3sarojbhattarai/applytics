import { ObjectId } from "mongodb";

export interface UserDoc {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

export interface SiteDoc {
  _id: ObjectId;
  userId: ObjectId;
  domain: string;
  createdAt: Date;
}

export interface EventDoc {
  _id: ObjectId;
  siteId: ObjectId;
  domain: string;
  timestamp: Date;
  path: string;
  referrer: string | null;
  referrerSource: string;
  browser: string;
  os: string;
  device: string;
  country: string | null;
  screenSize: string;
  visitorId: string;
  sessionId: string;
  isEntry: boolean;
}

export type Period = "day" | "7d" | "30d" | "91d";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}
