import { Handler, Context } from 'aws-lambda'
import { scrapers, getScraperByName } from './scrapers'
import { upsertJob } from './scrapers/supabase'
import { enrichDescriptions } from './scrapers/description-enricher'

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

  for (const scraper of scrapersToRun) {
    // Check remaining time - need at least 30 seconds for cleanup
    const remainingTime = context.getRemainingTimeInMillis()
    if (remainingTime < 60000) {
      console.log(`Stopping early - only ${remainingTime}ms remaining`)
      break
    }

    console.log(`\n[${scraper.name}] Starting scrape...`)
    const scraperStart = Date.now()

    try {
      const result = await scraper.scrape()

      if (result.success) {
        console.log(`[${scraper.name}] Found ${result.jobs.length} jobs`)

        // Enrich with descriptions (skips ones already cached in DB)
        try {
          const enrich = await enrichDescriptions(result.jobs)
          console.log(`[${scraper.name}] Descriptions: ${enrich.fetched} fetched, ${enrich.skipped} cached, ${enrich.failed} failed`)
        } catch (e) {
          console.error(`[${scraper.name}] Description enrichment error:`, e)
        }

        let savedCount = 0
        let newCount = 0

        // Save jobs to Supabase
        for (const job of result.jobs) {
          try {
            const saveResult = await upsertJob(job)
            if (saveResult.success) {
              savedCount++
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
    results,
  }

  console.log('\n=== Scrape Summary ===')
  console.log(JSON.stringify(summary, null, 2))

  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  }
}
