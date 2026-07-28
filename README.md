# Applytics

Applytics is a lightweight and open-source Google Analytics alternative with more features.

## Features

- **Cookieless tracking** — a lightweight script, no cookies, no personal data.
- **Key metrics** — unique visitors, total visits, pageviews, views per visit,
  bounce rate, and average visit duration.
- **Visitors time-series chart** with 24h / 7d / 30d / 91d ranges.
- **Breakdowns** — top sources, and top / entry / exit pages.
- **Live current visitors** (last 5 minutes), polled in the background.
- **Multi-site** — manage several websites under one account.
- **Custom auth** — email/password with JWT session cookies (no external auth
  service).

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local `mongod` or a connection string)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# then edit .env.local (see below)

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and add
your first site.

### Environment variables

| Variable              | Description                                              | Example                     |
| --------------------- | -------------------------------------------------------- | --------------------------- |
| `MONGODB_URI`         | MongoDB connection string                                | `mongodb://localhost:27017` |
| `MONGODB_DB`          | Database name                                            | `analytics`                 |
| `AUTH_SECRET`         | Secret used to sign session JWTs (use a long random string) | `a-long-random-string`  |
| `NEXT_PUBLIC_APP_URL` | Public base URL of this app (used in the install snippet)| `http://localhost:3000`     |

## Seeding demo data

To explore the dashboard with realistic data, seed synthetic events:

```bash
npm run seed                       # seeds ~15k events for "demo.localhost"
npm run seed -- mysite.com 20000   # custom domain + event count
```

This also creates a demo account you can log in with:

- **Email:** `admin@localhost.com`
- **Password:** `password123`

## Adding a site & installing the tracker

1. Log in and click **Add site**, entering your domain (e.g. `mysite.com` — no
   `https://`, no `www.`). The domain must match the snippet exactly.
2. Paste the snippet into the `<head>` of your website:

   ```html
   <script defer data-domain="mysite.com" src="http://localhost:3000/script.js"></script>
   ```

   Replace `src` with your deployed app URL in production.

3. Once the first pageview arrives, the dashboard appears automatically.

### Testing locally

By default the tracker **ignores traffic from `localhost`** (and automated
browsers). To test on a local page, add `data-track-localhost`:

```html
<script defer data-domain="mysite.com" data-track-localhost src="http://localhost:3000/script.js"></script>
```

A ready-made harness is included at
[`public/test.html`](public/test.html) — open
[http://localhost:3000/test.html](http://localhost:3000/test.html), click the
buttons to generate pageviews, then check your dashboard. (This guard lives in
[`public/script.js`](public/script.js).)

## How it works

```
 website (script.js)  ──POST /api/event──►  Next.js route handler
                                              │  parse UA + referrer
                                              │  daily-salted visitor hash (no IP stored)
                                              │  30-min session stitching
                                              ▼
                                         MongoDB  (raw `events`)
                                              │
                                    aggregation pipelines (src/lib/stats.ts)
                                              ▼
                                    /api/stats/[siteId]  ──►  dashboard UI
```

- **No cookies, no IP retained.** Each visitor is identified by
  `hash(dailySalt + siteId + ip + userAgent)`; the salt rotates daily, so the raw
  IP is never persisted and the id can't be tracked across days.
- **Sessions** are stitched server-side: a new pageview reuses the visitor's
  session if their last event was within 30 minutes, otherwise it starts a new
  session (an entry page).
- **Stats** are computed on the fly with MongoDB aggregation pipelines in
  [`src/lib/stats.ts`](src/lib/stats.ts).

## Project structure

```
src/
  app/
    api/
      event/route.ts            # pageview ingestion (POST)
      auth/{register,login,logout}/route.ts
      sites/route.ts            # list / create sites
      stats/[siteId]/route.ts   # dashboard stats payload
    dashboard/                  # authenticated dashboard pages
    login/  register/  page.tsx # auth pages + landing
    layout.tsx  globals.css
  components/
    ui/                         # shadcn/ui primitives
    dashboard/                  # KPI row, chart, breakdown lists, etc.
    providers.tsx               # React Query provider
    auth-form.tsx
  lib/
    mongodb.ts                  # cached client + index setup
    auth.ts                     # password hashing, JWT sessions
    parse.ts                    # UA parsing, referrer source, visitor hash
    stats.ts                    # aggregation helpers
    types.ts  utils.ts
  middleware.ts                 # protects /dashboard routes
public/
  script.js                     # the tracking snippet
  test.html                     # local test harness
scripts/
  seed.ts                       # synthetic data seeder
```

## API reference

| Method | Route                                          | Auth             | Description                                |
| ------ | ---------------------------------------------- | ---------------- | ------------------------------------------ |
| `POST` | `/api/event`                                   | none (CORS open) | Ingest a pageview (used by `script.js`)    |
| `POST` | `/api/auth/register`                           | none             | Create an account, sets session cookie     |
| `POST` | `/api/auth/login`                              | none             | Log in, sets session cookie                |
| `POST` | `/api/auth/logout`                             | cookie           | Clear the session cookie                   |
| `GET`  | `/api/sites`                                   | cookie           | List the current user's sites              |
| `POST` | `/api/sites`                                   | cookie           | Register a new site                        |
| `GET`  | `/api/stats/[siteId]?period=day\|7d\|30d\|91d` | cookie           | Full dashboard payload for a site          |

## Scripts

| Command         | Description                    |
| --------------- | ------------------------------ |
| `npm run dev`   | Start the dev server           |
| `npm run build` | Production build               |
| `npm run start` | Serve the production build     |
| `npm run lint`  | Run ESLint                     |
| `npm run seed`  | Seed synthetic analytics data  |

## License

MIT
