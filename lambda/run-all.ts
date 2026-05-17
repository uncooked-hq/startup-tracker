/**
 * Run all scrapers locally and save to Supabase
 *
 * - Upserts all found jobs (new ones created, existing ones get last_seen_at updated)
 * - After scraping, marks jobs not seen in this run as is_active: false
 *   (only if the scraper for that source succeeded — avoids marking jobs inactive due to scraper failures)
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
import { upsertJob, getSupabase } from './scrapers/supabase'
import { enrichDescriptions } from './scrapers/description-enricher'

async function deactivateStaleJobs(
  seenRoleIds: Set<string>,
  successfulSources: Set<string>,
) {
  const supabase = getSupabase()

  // Get all currently active roles
  const { data: activeRoles, error } = await supabase
    .from('tracker_roles')
    .select('id')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching active roles:', error.message)
    return { deactivated: 0 }
  }

  if (!activeRoles || activeRoles.length === 0) {
    return { deactivated: 0 }
  }

  // For each active role not seen in this scrape, check if its source's scraper succeeded
  const staleIds: string[] = []

  for (const role of activeRoles) {
    if (seenRoleIds.has(role.id)) continue

    // Check which source(s) this role came from
    const { data: sources } = await supabase
      .from('tracker_role_sources')
      .select('source')
      .eq('tracker_role_id', role.id)

    if (!sources || sources.length === 0) {
      // No source info — skip (don't deactivate jobs we can't verify)
      continue
    }

    // Only deactivate if ALL of this role's sources had successful scrapes
    // (if a scraper failed, we can't know if the job is still up)
    const allSourcesScraped = sources.every((s) =>
      successfulSources.has(s.source),
    )

    if (allSourcesScraped) {
      staleIds.push(role.id)
    }
  }

  if (staleIds.length === 0) {
    return { deactivated: 0 }
  }

  // Batch deactivate in chunks of 100
  let deactivated = 0
  for (let i = 0; i < staleIds.length; i += 100) {
    const batch = staleIds.slice(i, i + 100)
    const { error: updateError } = await supabase
      .from('tracker_roles')
      .update({ is_active: false })
      .in('id', batch)

    if (updateError) {
      console.error('Error deactivating roles:', updateError.message)
    } else {
      deactivated += batch.length
    }
  }

  return { deactivated }
}

async function runAll() {
  console.log(`=== Running ${scrapers.length} scrapers ===\n`)

  let totalFound = 0
  let totalSaved = 0
  let totalFailed = 0
  const seenRoleIds = new Set<string>()
  const successfulSources = new Set<string>()
  const results: { name: string; found: number; saved: number; error?: string }[] = []

  for (const scraper of scrapers) {
    console.log(`\n[${scraper.name}] Starting...`)

    try {
      const result = await scraper.scrape()

      if (result.success) {
        console.log(`[${scraper.name}] Found ${result.jobs.length} jobs`)
        totalFound += result.jobs.length
        successfulSources.add(scraper.sourceUrl)

        // Enrich with descriptions + extract sponsorship/funding + detect expired pages
        try {
          const enrich = await enrichDescriptions(result.jobs)
          console.log(`[${scraper.name}] Descriptions: ${enrich.fetched} fetched, ${enrich.skipped} cached, ${enrich.failed} failed, ${enrich.expired} expired`)
        } catch (e) {
          console.error(`[${scraper.name}] Description enrichment error:`, e)
        }

        let saved = 0
        let expiredSkipped = 0
        for (const job of result.jobs) {
          // Skip jobs flagged as expired during enrichment — let stale-deactivation
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

  // Deactivate stale jobs (only for sources whose scraper succeeded)
  console.log('\n--- Checking for stale jobs ---')
  const { deactivated } = await deactivateStaleJobs(seenRoleIds, successfulSources)
  console.log(`Deactivated ${deactivated} stale jobs`)

  console.log('\n\n=== FINAL SUMMARY ===')
  console.log(`Scrapers run: ${scrapers.length}`)
  console.log(`Scrapers failed: ${totalFailed}`)
  console.log(`Total jobs found: ${totalFound}`)
  console.log(`Total jobs saved: ${totalSaved}`)
  console.log(`Stale jobs deactivated: ${deactivated}`)
  console.log('\nPer scraper:')
  for (const r of results) {
    const status = r.error ? `FAILED (${r.error})` : `${r.found} found, ${r.saved} saved`
    console.log(`  ${r.name}: ${status}`)
  }
}

runAll()
