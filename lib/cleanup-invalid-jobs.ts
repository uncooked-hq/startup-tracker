import { prisma } from './prisma'
import { BaseScraper } from './scrapers/base-scraper'

async function cleanupInvalidJobs() {
  console.log('Starting cleanup of invalid jobs...\n')

  const allJobs = await prisma.job.findMany({
    where: { is_active: true },
  })

  console.log(`Found ${allJobs.length} active jobs to check\n`)

  let deleted = 0
  let kept = 0

  for (const job of allJobs) {
    const isValid = BaseScraper.isValidJob(job.role_title, job.company_name, job.application_link)

    if (!isValid) {
      console.log(`Deleting invalid job: "${job.role_title}" at "${job.company_name}"`)
      await prisma.job.delete({
        where: { id: job.id },
      })
      deleted++
    } else {
      kept++
    }
  }

  console.log(`\n=== Cleanup Summary ===`)
  console.log(`Total jobs checked: ${allJobs.length}`)
  console.log(`Deleted: ${deleted}`)
  console.log(`Kept: ${kept}`)
  console.log(`\nCleanup completed!`)

  await prisma.$disconnect()
}

cleanupInvalidJobs()
  .catch((error) => {
    console.error('Error during cleanup:', error)
    process.exit(1)
  })

