/**
 * Test multiple scrapers locally
 */

import { scrapers } from './scrapers'
import { upsertJob } from './scrapers/supabase'

async function testMultiple() {
  console.log('=== Testing Multiple Scrapers ===\n')

  // Test first 3 scrapers only (to save time)
  const testScrapers = scrapers.slice(0, 3)

  let totalFound = 0
  let totalSaved = 0

  for (const scraper of testScrapers) {
    console.log(`\n[${scraper.name}] Starting...`)

    try {
      const result = await scraper.scrape()

      if (result.success) {
        console.log(`[${scraper.name}] ✓ Found ${result.jobs.length} jobs`)
        totalFound += result.jobs.length

        // Save all jobs
        for (const job of result.jobs) {
          const saveResult = await upsertJob(job)
          if (saveResult.success) {
            totalSaved++
          }
        }
        console.log(`[${scraper.name}] ✓ Saved ${result.jobs.length} jobs`)
      } else {
        console.log(`[${scraper.name}] ✗ Failed: ${result.error}`)
      }
    } catch (error) {
      console.error(`[${scraper.name}] Error:`, error)
    }
  }

  console.log('\n=== Summary ===')
  console.log(`Scrapers tested: ${testScrapers.length}`)
  console.log(`Total jobs found: ${totalFound}`)
  console.log(`Total jobs saved: ${totalSaved}`)
}

testMultiple()
