/**
 * Run all scrapers locally and save to Supabase
 *
 * - Upserts all found jobs (new ones created, existing ones get last_seen_at updated)
 * - After scraping, URL-verifies any active role NOT seen in this run by
 *   fetching its source page via Jina — a role survives only if at least one
 *   of its source URLs returns content that doesn't match an expired-posting
 *   pattern. Anything else is deactivated.
 * - Finally enforces a 60-day age cap on posting_date as a backstop.
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
import { enrichDescriptions, fetchDescription, isExpiredPage } from './scrapers/description-enricher'

/**
 * Deactivate roles whose posting_date is older than `maxAgeDays`.
 * For sources that don't expose a real post date the scraper writes the time
 * of first sighting, so this still bounds those roles to a reasonable lifetime.
 */
async function deactivateOldJobs(maxAgeDays: number) {
  const supabase = getSupabase()
  const threshold = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)

  // Find active rows older than the threshold so we can count them
  const { data: oldRoles, error: findError } = await supabase
    .from('tracker_roles')
    .select('id')
    .eq('is_active', true)
    .lt('posting_date', threshold.toISOString())

  if (findError) {
    console.error('Error finding old jobs:', findError.message)
    return { deactivated: 0 }
  }
  if (!oldRoles || oldRoles.length === 0) return { deactivated: 0 }

  const ids = oldRoles.map(r => r.id)
  let deactivated = 0
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const { error } = await supabase
      .from('tracker_roles')
      .update({ is_active: false })
      .in('id', batch)
    if (error) {
      console.error('Error deactivating old jobs:', error.message)
    } else {
      deactivated += batch.length
    }
  }
  return { deactivated }
}

/**
 * Verify any currently-active role that wasn't seen in this scrape by fetching
 * its source URL(s). A role survives only if at least one source URL returns
 * non-null content AND that content doesn't match an expired-posting pattern.
 *
 * Replaces the older "all sources scraped successfully" heuristic — which
 * leaked through whenever an aggregator silently stopped listing a closed
 * role but the underlying URL had already been removed.
 *
 * Cost: bounded by Jina's module-level semaphore (concurrency 3). Roles that
 * were seen in this scrape are skipped — their last_seen_at is already fresh.
 */
async function verifyAndDeactivateUnseenJobs(seenRoleIds: Set<string>) {
  const supabase = getSupabase()

  // Pull all active roles plus their source URLs in one round-trip
  const { data: activeRoles, error } = await supabase
    .from('tracker_roles')
    .select('id, tracker_role_sources(application_url)')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching active roles:', error.message)
    return { deactivated: 0, checked: 0, unseen: 0 }
  }
  if (!activeRoles || activeRoles.length === 0) {
    return { deactivated: 0, checked: 0, unseen: 0 }
  }

  const unseen = activeRoles.filter((r: any) => !seenRoleIds.has(r.id))
  if (unseen.length === 0) return { deactivated: 0, checked: 0, unseen: 0 }

  console.log(`Verifying ${unseen.length} unseen active roles via URL fetch...`)

  const toDeactivate: string[] = []
  let urlsChecked = 0

  await Promise.all(
    unseen.map(async (role: any) => {
      const sources = role.tracker_role_sources || []
      if (sources.length === 0) {
        // Orphaned role — no sources to verify and UI hides it anyway. Mark inactive for hygiene.
        toDeactivate.push(role.id)
        return
      }

      // Role survives if ANY source URL is reachable AND not flagged as expired.
      let stillLive = false
      for (const src of sources) {
        if (!src.application_url) continue
        const desc = await fetchDescription(src.application_url)
        urlsChecked++
        if (desc && !isExpiredPage(desc)) {
          stillLive = true
          break
        }
      }
      if (!stillLive) toDeactivate.push(role.id)
    }),
  )

  let deactivated = 0
  for (let i = 0; i < toDeactivate.length; i += 100) {
    const batch = toDeactivate.slice(i, i + 100)
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

  return { deactivated, checked: urlsChecked, unseen: unseen.length }
}

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

  // URL-verify any active role we didn't see this run; deactivate dead/expired pages
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
