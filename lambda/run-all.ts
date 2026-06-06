/**
 * Run all scrapers locally and save to Supabase.
 *
 * - Upserts all found jobs (new ones created, existing ones get last_seen_at updated)
 * - Skips jobs flagged inactive during enrichment (expired/dead source pages)
 * - Prunes stale roles via the shared core in scrapers/prune.ts: URL-verifies any
 *   active role NOT seen this run (direct fetch + expired-banner check) and applies
 *   a 60-day age cap. The deployed Lambda (handler.ts) uses the same core.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env BEFORE anything uses env vars
const envPath = resolve(__dirname, '.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.replace(/\r/g, '').split('\n')) {
  const match = line.match(/^([^#=]+)=(.+)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

// Now safe to import - env vars are set
import { scrapers } from './scrapers'
import { upsertJob } from './scrapers/supabase'
import { enrichDescriptions } from './scrapers/description-enricher'
import { verifyAndDeactivateUnseenJobs, deactivateOldJobs } from './scrapers/prune'

async function runAll() {
  console.log(`=== Running ${scrapers.length} scrapers ===\n`)

  let totalFound = 0
  let totalSaved = 0
  let totalFailed = 0
  const seenRoleIds = new Set<string>()
  const results: { name: string; found: number; saved: number; error?: string }[] = []

  for (const scraper of scrapers) {
    console.log(`\n[${scraper.name}] Starting...`)

    try {
      const result = await scraper.scrape()

      if (result.success) {
        console.log(`[${scraper.name}] Found ${result.jobs.length} jobs`)
        totalFound += result.jobs.length

        // Enrich with descriptions + extract sponsorship/funding + detect expired/dead pages
        try {
          const enrich = await enrichDescriptions(result.jobs)
          console.log(`[${scraper.name}] Descriptions: ${enrich.fetched} fetched, ${enrich.skipped} cached, ${enrich.failed} failed, ${enrich.expired} expired, ${enrich.dead} dead`)
        } catch (e) {
          console.error(`[${scraper.name}] Description enrichment error:`, e)
        }

        let saved = 0
        let expiredSkipped = 0
        for (const job of result.jobs) {
          // Skip jobs flagged as expired/dead during enrichment — let stale-deactivation
          // clean up any existing DB row for them.
          if (job.is_active === false) {
            expiredSkipped++
            continue
          }
          const saveResult = await upsertJob(job)
          if (saveResult.success) {
            saved++
            if (saveResult.roleId) {
              seenRoleIds.add(saveResult.roleId)
            }
          } else {
            console.error(`  Save failed: ${saveResult.error}`)
          }
        }
        totalSaved += saved
        console.log(`[${scraper.name}] Saved ${saved}/${result.jobs.length}${expiredSkipped ? ` (skipped ${expiredSkipped} expired)` : ''}`)
        results.push({ name: scraper.name, found: result.jobs.length, saved })
      } else {
        console.log(`[${scraper.name}] FAILED: ${result.error}`)
        totalFailed++
        results.push({ name: scraper.name, found: 0, saved: 0, error: result.error })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${scraper.name}] ERROR: ${msg}`)
      totalFailed++
      results.push({ name: scraper.name, found: 0, saved: 0, error: msg })
    }
  }

  // URL-verify any active role we didn't see this run; deactivate dead/expired pages.
  // No deadline locally — verify everything.
  console.log('\n--- Verifying unseen active roles via URL fetch ---')
  const { deactivated, checked, unseen } = await verifyAndDeactivateUnseenJobs(seenRoleIds)
  console.log(`Checked ${checked} URLs across ${unseen} unseen roles; deactivated ${deactivated}`)

  // Deactivate jobs older than 60 days regardless of whether they were seen
  console.log('\n--- Checking for old jobs (>60 days) ---')
  const { deactivated: oldDeactivated } = await deactivateOldJobs(60)
  console.log(`Deactivated ${oldDeactivated} old jobs`)

  console.log('\n\n=== FINAL SUMMARY ===')
  console.log(`Scrapers run: ${scrapers.length}`)
  console.log(`Scrapers failed: ${totalFailed}`)
  console.log(`Total jobs found: ${totalFound}`)
  console.log(`Total jobs saved: ${totalSaved}`)
  console.log(`Unseen jobs deactivated (URL-verified): ${deactivated}`)
  console.log(`Old jobs deactivated: ${oldDeactivated}`)
  console.log('\nPer scraper:')
  for (const r of results) {
    const status = r.error ? `FAILED (${r.error})` : `${r.found} found, ${r.saved} saved`
    console.log(`  ${r.name}: ${status}`)
  }
}

runAll()
