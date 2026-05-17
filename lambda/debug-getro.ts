import { GenericVCScraper } from './scrapers/generic-vc-scraper'

async function test() {
  const scraper = new GenericVCScraper('Seedcamp', 'https://talent.seedcamp.com/jobs', 'Seedcamp')

  await scraper.initializeBrowser()
  const result = await scraper.scrape()

  if (!result.success) {
    console.log(`FAILED: ${result.error}`)
    process.exit(1)
  }

  console.log(`Found ${result.jobs.length} jobs:\n`)
  for (const job of result.jobs) {
    const locStatus = job.location === 'Not specified' ? '❌' : '✅'
    const salBad = job.compensation?.toLowerCase().includes('confirm') ? '🚫 BAD' : ''
    console.log(`  ${locStatus} ${job.role_title} @ ${job.company_name}`)
    console.log(`     Location: ${job.location} | Salary: ${job.compensation} ${salBad}`)
  }

  const withLoc = result.jobs.filter(j => j.location !== 'Not specified').length
  const badSal = result.jobs.filter(j => j.compensation?.toLowerCase().includes('confirm')).length
  console.log(`\nLocation: ${withLoc}/${result.jobs.length} | Bad salary entries: ${badSal}`)

  process.exit(0)
}

test().catch(e => { console.error(e); process.exit(1) })
