import { prisma } from '@/lib/prisma'
import { scrapers } from './index'

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
        
        // Upsert jobs to new TrackerRole and TrackerRoleSource tables
        let processedJobs = 0
        let newRoles = 0
        let existingRoles = 0
        let newSources = 0
        let updatedSources = 0
        
        for (const job of result.jobs) {
          try {
            // 1. Find or create TrackerRole (match by company_name + role_title)
            const existingRole = await prisma.trackerRole.findFirst({
              where: {
                company_name: job.company_name,
                role_title: job.role_title,
              },
            })
            
            let trackerRole
            if (existingRole) {
              // Update last_seen_at for existing role
              trackerRole = await prisma.trackerRole.update({
                where: { id: existingRole.id },
                data: {
                  last_seen_at: new Date(),
                },
              })
              existingRoles++
            } else {
              // Create new TrackerRole
              trackerRole = await prisma.trackerRole.create({
                data: {
                  company_name: job.company_name,
                  company_domain: null,
                  industry: job.industry,
                  funding_stage: job.funding_stage,
                  role_title: job.role_title,
                  role_level: job.role_level,
                  role_type: job.role_type,
                  work_mode: job.work_mode,
                  location: job.location,
                  compensation_text: job.compensation,
                  salary_min: null,
                  salary_max: null,
                  salary_currency: null,
                  offers_equity: job.equity ? true : null,
                  company_description: job.company_description,
                  role_description: null,
                  posting_date: job.posting_date,
                  closing_date: job.closing_date,
                  is_active: job.is_active,
                  first_seen_at: new Date(),
                  last_seen_at: new Date(),
                },
              })
              newRoles++
            }
            
            // 2. Check if source already exists
            const existingSource = await prisma.trackerRoleSource.findUnique({
              where: {
                source_source_role_id: {
                  source: job.source_website,
                  source_role_id: job.application_link,
                },
              },
            })
            
            // 3. Upsert TrackerRoleSource
            await prisma.trackerRoleSource.upsert({
              where: {
                source_source_role_id: {
                  source: job.source_website,
                  source_role_id: job.application_link,
                },
              },
              update: {
                last_seen_at: new Date(),
                last_scraped_at: new Date(),
                application_url: job.application_link,
                scrape_status: 'success',
                raw_payload: job as any,
              },
              create: {
                tracker_role_id: trackerRole.id,
                source: job.source_website,
                source_role_id: job.application_link,
                source_url: job.source_website,
                application_url: job.application_link,
                last_seen_at: new Date(),
                last_scraped_at: new Date(),
                scrape_status: 'success',
                raw_payload: job as any,
              },
            })
            
            if (existingSource) {
              updatedSources++
            } else {
              newSources++
            }
            
            processedJobs++
          } catch (error) {
            console.error(`[${scraper.name}] Error processing job: ${job.application_link}`, error)
          }
        }
        
        console.log(`[${scraper.name}] ✓ Processed ${processedJobs} jobs`)
        console.log(`[${scraper.name}]   - TrackerRoles: ${newRoles} new, ${existingRoles} existing`)
        console.log(`[${scraper.name}]   - TrackerRoleSources: ${newSources} new, ${updatedSources} updated`)
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

