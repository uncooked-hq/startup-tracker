/**
 * Local test script - run with: npx tsx test-local.ts
 */

import { GenericVCScraper } from './scrapers/generic-vc-scraper'
import { upsertJob } from './scrapers/supabase'

async function testScraper() {
  console.log('=== Local Scraper Test ===\n')

  // Check env vars
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing environment variables!')
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('Environment variables set ✓')
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL}`)
  console.log('')

  // Test with a single scraper (Greylock is usually reliable)
  const scraper = new GenericVCScraper('Greylock', 'https://jobs.greylock.com/jobs', 'Greylock')

  console.log(`Testing scraper: ${scraper.name}`)
  console.log(`URL: ${scraper.sourceUrl}`)
  console.log('')

  try {
    console.log('Starting scrape...')
    const result = await scraper.scrape()

    if (result.success) {
      console.log(`✓ Scrape successful! Found ${result.jobs.length} jobs`)

      if (result.jobs.length > 0) {
        console.log('\nFirst 3 jobs found:')
        result.jobs.slice(0, 3).forEach((job, i) => {
          console.log(`  ${i + 1}. ${job.company_name} - ${job.role_title}`)
          console.log(`     Link: ${job.application_link}`)
        })

        // Test saving to Supabase
        console.log('\nTesting Supabase save with first job...')
        const firstJob = result.jobs[0]
        const saveResult = await upsertJob(firstJob)

        if (saveResult.success) {
          console.log(`✓ Saved to Supabase successfully! (isNew: ${saveResult.isNew})`)
        } else {
          console.error(`✗ Failed to save: ${saveResult.error}`)
        }
      } else {
        console.log('No jobs found (site may have changed structure)')
      }
    } else {
      console.error(`✗ Scrape failed: ${result.error}`)
    }
  } catch (error) {
    console.error('Error:', error)
  }

  console.log('\n=== Test Complete ===')
}

testScraper()
