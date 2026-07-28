import crypto from "crypto";
import { UAParser } from "ua-parser-js";

/**
 * Derive a human-friendly referrer "source" from a referrer URL.
 * Maps common search engines / networks to a canonical name, otherwise
 * returns the bare hostname. Empty referrers become "Direct / None".
 */
const SOURCE_MAP: Record<string, string> = {
  "google.": "Google",
  "bing.": "Bing",
  "duckduckgo.": "DuckDuckGo",
  "search.brave.": "Brave",
  "yahoo.": "Yahoo",
  "yandex.": "Yandex",
  "baidu.": "Baidu",
  "ecosia.": "Ecosia",
  "github.": "GitHub",
  "t.co": "Twitter",
  "twitter.": "Twitter",
  "x.com": "Twitter",
  "facebook.": "Facebook",
  "linkedin.": "LinkedIn",
  "lnkd.in": "LinkedIn",
  "reddit.": "Reddit",
  "news.ycombinator.": "Hacker News",
  "youtube.": "YouTube",
  "chatgpt.": "ChatGPT",
  "chat.openai.": "ChatGPT",
  "producthunt.": "Product Hunt",
};

export function referrerSource(
  referrer: string | null | undefined,
  currentDomain: string
): string {
  if (!referrer) return "Direct / None";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "Direct / None";
  }
  if (!host) return "Direct / None";
  // Same-domain referrals are treated as direct.
  if (host === currentDomain || host === `www.${currentDomain}`) {
    return "Direct / None";
  }
  for (const [key, name] of Object.entries(SOURCE_MAP)) {
    if (host.includes(key)) return name;
  }
  return host.replace(/^www\./, "");
}

export interface ParsedUA {
  browser: string;
  os: string;
  device: string;
}

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  const parser = new UAParser(ua || "");
  const result = parser.getResult();
  const deviceType = result.device.type;
  return {
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
    device: deviceType === "mobile" ? "Mobile" : deviceType === "tablet" ? "Tablet" : "Desktop",
  };
}

/**
 * Rotating daily salt so a raw IP+UA can be hashed into a stable
 * per-day visitor id without ever persisting the IP (Plausible-style).
 */
let saltCache: { day: string; value: string } | null = null;

function currentSalt(): string {
  const day = new Date().toISOString().slice(0, 10);
  if (saltCache && saltCache.day === day) return saltCache.value;
  const base = process.env.AUTH_SECRET || "analytics-salt";
  const value = crypto.createHash("sha256").update(`${base}:${day}`).digest("hex");
  saltCache = { day, value };
  return value;
}

export function visitorHash(
  siteId: string,
  ip: string,
  userAgent: string
): string {
  return crypto
    .createHash("sha256")
    .update(`${currentSalt()}:${siteId}:${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}
