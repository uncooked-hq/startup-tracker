/**
 * Test harness for newly-added scrapers.
 * Usage: npx tsx lambda/test-new-scraper.ts <name>
 * Prints job count + first 5 samples. Does NOT write to DB.
 */

import { TopStartupsScraper } from './scrapers/topstartups-scraper'
import { BuiltInScraper } from './scrapers/builtin-scraper'
import { HardwareFYIScraper } from './scrapers/hardwarefyi-scraper'
import { AI_LABS, buildAILabScraper } from './scrapers/ai-labs'

const arg = process.argv[2] || 'topstartups'

async function main() {
  let scraper
  switch (arg.toLowerCase()) {
    case 'topstartups':
      scraper = new TopStartupsScraper(2)
      break
    case 'builtin':
      scraper = new BuiltInScraper(2)
      break
    case 'hardwarefyi':
      scraper = new HardwareFYIScraper()
      break
    case 'ai-labs':
    case 'ailabs': {
      // Run all 6 labs in parallel and report summary + samples
      console.log(`Running all ${AI_LABS.length} AI labs in parallel...`)
      const t0 = Date.now()
      const results = await Promise.all(AI_LABS.map(l => buildAILabScraper(l).scrape()))
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
      console.log(`\n=== RESULTS (${elapsed}s) ===`)
      let total = 0
      for (const r of results) {
        console.log(`${r.source}: ${r.success ? `${r.jobs.length} jobs` : `FAILED — ${r.error}`}`)
        total += r.jobs.length
      }
      console.log(`TOTAL: ${total} jobs`)
      console.log('\n=== SAMPLES (one per lab) ===')
      for (const r of results) {
        if (r.jobs.length === 0) continue
        const j = r.jobs[0]
        console.log(JSON.stringify({
          source: r.source,
          title: j.role_title,
          company: j.company_name,
          location: j.location,
          work_mode: j.work_mode,
          role_level: j.role_level,
          role_type: j.role_type,
          industry: j.industry,
          compensation: j.compensation,
          tag: j.funding_stage,
          funding_details: (j as any).funding_details,
          link: j.application_link,
          posted: j.posting_date.toISOString().slice(0, 10),
        }, null, 2))
      }
      return
    }
    default:
      // Try matching a single AI lab by slug
      const match = AI_LABS.find(l => l.slug === arg.toLowerCase() || l.display.toLowerCase() === arg.toLowerCase())
      if (match) {
        scraper = buildAILabScraper(match)
        break
      }
      console.error(`Unknown scraper: ${arg}`)
      process.exit(1)
  }

  const t0 = Date.now()
  const result = await scraper.scrape()
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('\n=== RESULT ===')
  console.log(`Source: ${result.source}`)
  console.log(`Success: ${result.success}`)
  console.log(`Jobs: ${result.jobs.length}`)
  console.log(`Elapsed: ${elapsed}s`)
  if (result.error) console.log(`Error: ${result.error}`)

  console.log('\n=== SAMPLES (first 5) ===')
  for (const job of result.jobs.slice(0, 5)) {
    console.log(JSON.stringify({
      title: job.role_title,
      company: job.company_name,
      location: job.location,
      work_mode: job.work_mode,
      role_level: job.role_level,
      role_type: job.role_type,
      industry: job.industry,
      compensation: job.compensation,
      funding: job.funding_stage,
      funding_details: (job as any).funding_details,
      link: job.application_link,
      posted: job.posting_date.toISOString().slice(0, 10),
    }, null, 2))
  }
}

main().catch(e => { console.error(e); process.exit(1) })
