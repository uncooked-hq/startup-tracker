# Render Environment Variables Setup

## Required Environment Variables

### For Web Service (Frontend + API)

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://user:password@host:5432/dbname` | **Required.** Production Postgres connection string. Get from your DB provider (e.g., Supabase, Railway, Neon). |
| `NODE_ENV` | `production` | Tells Next.js to optimize for production. |

### For Cron Job (Scraper Runner)

Same as Web Service:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://user:password@host:5432/dbname` | **Required.** Must be the same DB URL as Web Service so scrapers write to the same DB the frontend reads from. |
| `NODE_ENV` | `production` | Optional but recommended. |

---

## How to Set Env Vars in Render

### Via Dashboard (easiest)

1. Go to your Render service (Web Service or Cron Job).
2. Click **"Environment"** tab.
3. Click **"Add Environment Variable"**.
4. Enter key (e.g., `DATABASE_URL`) and value (e.g., `postgresql://...`).
5. Click **"Save Changes"** — service auto-redeploys.

### Via render.yaml (Infrastructure as Code)

Create `render.yaml` in repo root:

```yaml
services:
  - type: web
    name: uncooked-labs
    env: node
    plan: starter
    branch: frontend
    buildCommand: npm ci && npx playwright install --with-deps && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false  # Set in Render dashboard, not in YAML (never commit secrets to repo)

  - type: cron
    name: uncooked-labs-scraper
    branch: frontend
    schedule: "0 6,12,18,0 * * *"  # 4x daily: 06:00, 12:00, 18:00, 00:00 UTC
    buildCommand: npm ci && npx playwright install --with-deps && npm run build
    command: npm run scrape
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
```

Then set `DATABASE_URL` in Render dashboard for both services.

---

## How to Get `DATABASE_URL`

### Option A: Supabase (Recommended for Render)

1. Create a free Supabase project at https://supabase.com.
2. Go to **Settings > Database > Connection Info**.
3. Copy the **"PostgreSQL"** connection string (looks like `postgresql://postgres:PASSWORD@db.supabase.co:5432/postgres`).
4. Paste into Render env var `DATABASE_URL`.
5. In your repo, run locally to initialize schema:
   ```bash
   DATABASE_URL="<your_url>" npx prisma db push
   ```

### Option B: Railway (Quick setup)

1. Go to https://railway.app.
2. Create new project → add **PostgreSQL** plugin.
3. Copy connection string from plugin dashboard.
4. Paste into Render env var `DATABASE_URL`.

### Option C: Neon (Free tier available)

1. Go to https://neon.tech.
2. Create a database.
3. Copy connection string from **Connection details**.
4. Paste into Render env var `DATABASE_URL`.

---

## Quick Checklist

- [ ] Create production Postgres DB (Supabase / Railway / Neon).
- [ ] Copy `DATABASE_URL` connection string.
- [ ] Set `DATABASE_URL` in Render Web Service environment variables.
- [ ] Set `DATABASE_URL` in Render Cron Job environment variables (same value).
- [ ] Set `NODE_ENV=production` on both (optional but recommended).
- [ ] Run `DATABASE_URL="<url>" npx prisma db push` locally to initialize schema on production DB.
- [ ] Deploy Web Service on Render.
- [ ] Deploy Cron Job on Render.
- [ ] Test: visit `https://uncooked-labs.onrender.com` and check `/api/jobs` endpoint.

---

## Troubleshooting

**"Can't connect to database"**
- Verify `DATABASE_URL` is correct (check for typos).
- Ensure Postgres DB is running and allows external connections.
- If using Supabase, check IP allowlist doesn't block Render's IPs.

**"Scrapers fail to run"**
- Check Cron Job logs in Render dashboard (Logs tab).
- Verify `DATABASE_URL` is set in Cron Job env vars (same as Web Service).
- Ensure Playwright browsers installed (`npx playwright install --with-deps` in build command).

**"UI shows no jobs after deploy"**
- Confirm Web Service and Cron Job share the same `DATABASE_URL`.
- Run `npm run scrape` once manually (via Cron Job or local terminal) to populate DB.
- Check API endpoint: `curl https://uncooked-labs.onrender.com/api/jobs`.

---

## Next Steps

1. Create Postgres DB and copy connection string.
2. Go to Render dashboard → Environment tab.
3. Add `DATABASE_URL` env var.
4. Deploy Web Service.
5. Test in browser at `https://uncooked-labs.onrender.com`.
