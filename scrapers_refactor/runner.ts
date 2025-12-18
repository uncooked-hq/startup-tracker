/**
 * Scraper runner - runs all scrapers and saves to database
 */

import { prisma } from '@/lib/prisma'
import { scrapers, runScraper } from './index'

async function runAllScrapers() {
  console.log(`\n🚀 Starting scraper run at ${new Date().toISOString()}`)
  console.log(`Running ${scrapers.length} scraper(s)...\n`)

  let totalJobs = 0
  let successCount = 0
  let failureCount = 0

  for (const scraper of scrapers) {
    const result = await runScraper(scraper)

    if (result.success) {
      console.log(`\n[${scraper.name}] Processing ${result.roles.length} roles...`)
      
      let newRoles = 0
      let existingRoles = 0
      let newSources = 0
      let updatedSources = 0

      for (const item of result.roles) {
        const { role: job, source: sourceData } = item
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
                company_domain: job.company_domain,
                industry: job.industry,
                funding_stage: job.funding_stage,
                role_title: job.role_title,
                role_level: job.role_level,
                role_type: job.role_type,
                work_mode: job.work_mode,
                location: job.location,
                compensation_text: job.compensation_text,
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                salary_currency: job.salary_currency,
                offers_equity: job.offers_equity,
                company_description: job.company_description,
                role_description: job.role_description,
                posting_date: job.posting_date,
                closing_date: job.closing_date,
                is_active: true,
                first_seen_at: new Date(),
                last_seen_at: new Date(),
              },
            })
            newRoles++
          }

          // 2. Upsert TrackerRoleSource
          const existingSource = await prisma.trackerRoleSource.findUnique({
            where: {
              source_source_role_id: {
                source: sourceData.source,
                source_role_id: sourceData.source_role_id,
              },
            },
          })

          await prisma.trackerRoleSource.upsert({
            where: {
              source_source_role_id: {
                source: sourceData.source,
                source_role_id: sourceData.source_role_id,
              },
            },
            update: {
              last_seen_at: new Date(),
              last_scraped_at: new Date(),
              application_url: sourceData.application_url,
              scrape_status: 'success',
              raw_payload: sourceData.raw_payload || item as any,
            },
            create: {
              tracker_role_id: trackerRole.id,
              source: sourceData.source,
              source_role_id: sourceData.source_role_id,
              source_url: sourceData.source_url,
              application_url: sourceData.application_url,
              last_seen_at: new Date(),
              last_scraped_at: new Date(),
              scrape_status: 'success',
              raw_payload: sourceData.raw_payload || item as any,
            },
          })

          if (existingSource) {
            updatedSources++
          } else {
            newSources++
          }
        } catch (error) {
          console.error(`[${scraper.name}] Error saving role: ${sourceData.application_url}`, error)
        }
      }

      console.log(`[${scraper.name}] ✓ Saved to database`)
      console.log(`  - Roles: ${newRoles} new, ${existingRoles} updated`)
      console.log(`  - Sources: ${newSources} new, ${updatedSources} updated`)

      totalJobs += result.roles.length
      successCount++
    } else {
      console.error(`[${scraper.name}] ✗ Failed: ${result.error}`)
      failureCount++
    }
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`📊 Summary`)
  console.log(`${'='.repeat(50)}`)
  console.log(`Scrapers:     ${scrapers.length} total`)
  console.log(`Success:      ${successCount}`)
  console.log(`Failed:       ${failureCount}`)
  console.log(`Total jobs:   ${totalJobs}`)
  console.log(`Completed:    ${new Date().toISOString()}`)
  console.log(`${'='.repeat(50)}\n`)
}

// Run it
runAllScrapers()
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
