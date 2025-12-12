# Troubleshooting Guide

## Current Issue: 500 Error on /api/jobs

### Status
✅ Database file exists at `prisma/dev.db`
✅ Database has 5 test jobs
✅ Database connection works from scripts
❌ Next.js API route returns 500 error

### Solution Steps

1. **Restart the Next.js dev server completely:**
   ```bash
   # Stop the server (Ctrl+C or Cmd+C)
   # Then restart:
   npm run dev
   ```

2. **Verify the .env file:**
   ```bash
   cat .env
   ```
   Should show: `DATABASE_URL="file:/Users/sameenshaik/Desktop/projects/UncookedTracker/prisma/dev.db"`

3. **Test the database connection:**
   Visit: `http://localhost:3000/api/test-db`
   
   This will show you:
   - If the database connection works
   - What path is being used
   - Any error messages

4. **Check server logs:**
   Look at the terminal where `npm run dev` is running. You should see error messages there.

### If Still Not Working

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Verify database file permissions:**
   ```bash
   ls -la prisma/dev.db
   ```

3. **Test API directly:**
   ```bash
   curl http://localhost:3000/api/test-db
   ```

### Expected Behavior

After restarting the server:
- `http://localhost:3000/api/test-db` should return `{"success": true, "jobCount": 5}`
- `http://localhost:3000/api/jobs` should return the list of jobs
- Dashboard should show 5 jobs

