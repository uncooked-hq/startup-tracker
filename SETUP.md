# Quick Setup Guide

## Current Status

✅ Database is set up with SQLite
✅ 5 test jobs have been seeded
✅ Scrapers are configured (YC, Work at a Startup, Wellfound)

## To See Jobs in Dashboard

**IMPORTANT:** You need to restart your Next.js dev server for the database connection to work:

1. Stop the current dev server (Ctrl+C or Cmd+C)
2. Restart it: `npm run dev`
3. Refresh your browser at `http://localhost:3000`

The database file is at: `prisma/dev.db` and contains 5 test jobs.

## To Run Scrapers

```bash
npm run scrape
```

This will attempt to scrape:
- Y Combinator jobs
- Work at a Startup
- Wellfound (AngelList)

**Note:** The scrapers may need selector adjustments based on the actual website structures. If they return 0 jobs, the websites may have changed their HTML structure.

## Database Commands

```bash
# View database in browser
npm run db:studio

# Add more test data
npm run db:seed

# Regenerate Prisma client (if schema changes)
npm run db:generate
```

## Troubleshooting

If you see "No jobs found":
1. Make sure the dev server was restarted after setting up the database
2. Check that `prisma/dev.db` exists
3. Run `npm run db:seed` to add test data
4. Check the browser console and server logs for errors

