import { Handler, Context } from 'aws-lambda'
import { scrapers, getScraperByName } from './scrapers'
import { upsertJob } from './scrapers/supabase'
import { enrichDescriptions } from './scrapers/description-enricher'
import { verifyAndDeactivateUnseenJobs, deactivateOldJobs } from './scrapers/prune'

interface ScrapeEvent {
  scraperName?: string
}

interface ScrapeResult {
  statusCode: number
  body: string
}

export const scrape: Handler<ScrapeEvent, ScrapeResult> = async (
  event: ScrapeEvent,
  context: Context
): Promise<ScrapeResult> => {
  console.log('Lambda invoked with event:', JSON.stringify(event))
  console.log('Remaining time:', context.getRemainingTimeInMillis(), 'ms')

  const scraperName = event.scraperName || 'all'
  const startTime = Date.now()

  let scrapersToRun = scrapers

  // If specific scraper requested
  if (scraperName !== 'all') {
    const scraper = getScraperByName(scraperName)
    if (!scraper) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Scraper '${scraperName}' not found`,
          availableScrapers: scrapers.map(s => s.name),
        }),
      }
    }
    scrapersToRun = [scraper]
  }

  console.log(`Running ${scrapersToRun.length} scraper(s)...`)

  const results: {
    scraper: string
    success: boolean
    jobsFound: number
    jobsSaved: number
    newJobs: number
    error?: string
  }[] = []

  let totalJobsFound = 0
  let totalJobsSaved = 0
  let totalNewJobs = 0
  // Track which roles we saw this run so the prune below can deactivate the rest.
  const seenRoleIds = new Set<string>()
  // If we bail out of the scrape loop early, seenRoleIds is incomplete and the
  // prune must NOT run (it would deactivate roles whose scraper never ran).
  let allScrapersRan = true

  for (const scraper of scrapersToRun) {
    // Check remaining time - need at least 30 seconds for cleanup
    const remainingTime = context.getRemainingTimeInMillis()
    if (remainingTime < 60000) {
      console.log(`Stopping early - only ${remainingTime}ms remaining`)
      allScrapersRan = false
      break
    }

    console.log(`\n[${scraper.name}] Starting scrape...`)
    const scraperStart = Date.now()

    try {
      const result = await scraper.scrape()

      if (result.success) {
        console.log(`[${scraper.name}] Found ${result.jobs.length} jobs`)

        // Enrich with descriptions (skips ones already cached in DB) and flag
        // expired/dead source pages as inactive.
        try {
          const enrich = await enrichDescriptions(result.jobs)
          console.log(`[${scraper.name}] Descriptions: ${enrich.fetched} fetched, ${enrich.skipped} cached, ${enrich.failed} failed, ${enrich.expired} expired, ${enrich.dead} dead`)
        } catch (e) {
          console.error(`[${scraper.name}] Description enrichment error:`, e)
        }

        let savedCount = 0
        let newCount = 0

        // Save jobs to Supabase
        for (const job of result.jobs) {
          // Skip jobs flagged expired/dead during enrichment so the upsert doesn't
          // (re)activate them; the prune deactivates any existing DB row.
          if (job.is_active === false) continue
          try {
            const saveResult = await upsertJob(job)
            if (saveResult.success) {
              savedCount++
              if (saveResult.roleId) seenRoleIds.add(saveResult.roleId)
              if (saveResult.isNew) {
                newCount++
              }
            } else {
              console.error(`[${scraper.name}] Failed to save job: ${saveResult.error}`)
            }
          } catch (error) {
            console.error(`[${scraper.name}] Error saving job:`, error)
          }
        }

        const duration = Date.now() - scraperStart
        console.log(`[${scraper.name}] Completed in ${duration}ms - Saved ${savedCount} jobs (${newCount} new)`)

        results.push({
          scraper: scraper.name,
          success: true,
          jobsFound: result.jobs.length,
          jobsSaved: savedCount,
          newJobs: newCount,
        })

        totalJobsFound += result.jobs.length
        totalJobsSaved += savedCount
        totalNewJobs += newCount
      } else {
        console.error(`[${scraper.name}] Failed: ${result.error}`)
        results.push({
          scraper: scraper.name,
          success: false,
          jobsFound: 0,
          jobsSaved: 0,
          newJobs: 0,
          error: result.error,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${scraper.name}] Exception: ${errorMessage}`)
      results.push({
        scraper: scraper.name,
        success: false,
        jobsFound: 0,
        jobsSaved: 0,
        newJobs: 0,
        error: errorMessage,
      })
    }
  }

  // Prune stale roles using the shared core. Bounded by the Lambda's remaining
  // time (keep a ~25s buffer for the final DB writes + response); the unseen pass
  // is idempotent, so anything skipped this run is picked up next run.
  // Only prune after a COMPLETE full run — seenRoleIds is only trustworthy when
  // every scraper ran. Pruning after a single-scraper invoke or an early-exit
  // run would deactivate roles whose scraper simply didn't run this time.
  const isFullRun = scraperName === 'all' && allScrapersRan
  const prune = { unseenDeactivated: 0, oldDeactivated: 0, checked: 0, unseen: 0, timedOut: false, skipped: false }
  const remainingForPrune = context.getRemainingTimeInMillis()
  if (isFullRun && remainingForPrune > 40000) {
    const deadlineAt = Date.now() + (remainingForPrune - 25000)
    try {
      console.log('\n=== Pruning stale roles ===')
      const v = await verifyAndDeactivateUnseenJobs(seenRoleIds, { deadlineAt })
      prune.unseenDeactivated = v.deactivated
      prune.checked = v.checked
      prune.unseen = v.unseen
      prune.timedOut = v.timedOut
      const old = await deactivateOldJobs(60)
      prune.oldDeactivated = old.deactivated
      console.log(`Prune: deactivated ${v.deactivated} unseen + ${old.deactivated} old (checked ${v.checked} URLs across ${v.unseen} unseen${v.timedOut ? ', hit time budget' : ''})`)
    } catch (e) {
      console.error('Prune error:', e)
    }
  } else {
    prune.skipped = true
    const why = !isFullRun
      ? `incomplete run (scraper=${scraperName}, allScrapersRan=${allScrapersRan})`
      : `only ${remainingForPrune}ms remaining`
    console.log(`Skipping prune — ${why}`)
  }

  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length

  const summary = {
    duration: `${totalDuration}ms`,
    scrapersRun: results.length,
    successful: successCount,
    failed: failureCount,
    totalJobsFound,
    totalJobsSaved,
    totalNewJobs,
    prune,
    results,
  }

  console.log('\n=== Scrape Summary ===')
  console.log(JSON.stringify(summary, null, 2))

  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  }
}
