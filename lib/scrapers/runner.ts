import { prisma } from '@/lib/prisma'
import { scrapers } from './index'
import type { JobData } from './types'

async function runScrapers() {
  console.log(`Starting scraper run at ${new Date().toISOString()}`)
  console.log(`Running ${scrapers.length} scrapers...\n`)

  let totalJobs = 0
  let successCount = 0
  let failureCount = 0

  for (const scraper of scrapers) {
    console.log(`\n[${scraper.name}] Starting scrape...`)
    
    try {
      const result = await scraper.scrape()

      if (result.success) {
        console.log(`[${scraper.name}] ✓ Successfully scraped ${result.jobs.length} jobs`)
        
        // Upsert jobs to database (only new/updated jobs)
        let upserted = 0
        let newJobs = 0
        let updatedJobs = 0
        
        for (const job of result.jobs) {
          try {
            // Check if job already exists
            const existing = await prisma.job.findUnique({
              where: { application_link: job.application_link },
            })
            
            const result = await prisma.job.upsert({
              where: {
                application_link: job.application_link,
              },
              update: {
                company_name: job.company_name,
                industry: job.industry,
                location: job.location,
                funding_stage: job.funding_stage,
                role_title: job.role_title,
                role_type: job.role_type,
                role_level: job.role_level,
                work_mode: job.work_mode,
                compensation: job.compensation,
                equity: job.equity,
                posting_date: job.posting_date,
                closing_date: job.closing_date,
                company_description: job.company_description,
                source_website: job.source_website,
                is_active: job.is_active,
                updatedAt: new Date(),
              },
              create: job,
            })
            
            if (existing) {
              updatedJobs++
            } else {
              newJobs++
            }
            upserted++
          } catch (error) {
            console.error(`[${scraper.name}] Error upserting job: ${job.application_link}`, error)
          }
        }
        
        console.log(`[${scraper.name}] ✓ Upserted ${upserted} jobs (${newJobs} new, ${updatedJobs} updated)`)
        totalJobs += result.jobs.length
        successCount++
      } else {
        console.error(`[${scraper.name}] ✗ Failed: ${result.error}`)
        failureCount++
      }
    } catch (error) {
      console.error(`[${scraper.name}] ✗ Exception:`, error)
      failureCount++
      // Continue to next scraper - don't crash the entire process
    }
  }

  console.log(`\n=== Scraper Run Summary ===`)
  console.log(`Total scrapers: ${scrapers.length}`)
  console.log(`Successful: ${successCount}`)
  console.log(`Failed: ${failureCount}`)
  console.log(`Total jobs scraped: ${totalJobs}`)
  console.log(`Completed at ${new Date().toISOString()}\n`)

  await prisma.$disconnect()
}

// Run if executed directly
if (require.main === module) {
  runScrapers()
    .catch((error) => {
      console.error('Fatal error in scraper runner:', error)
      process.exit(1)
    })
    .finally(() => {
      process.exit(0)
    })
}

export { runScrapers }

