/**
 * Detailed job viewer with filtering and data validation
 * Usage: npm run view-jobs-detailed [limit] [filter]
 * Examples:
 *   npm run view-jobs-detailed
 *   npm run view-jobs-detailed 20
 *   npm run view-jobs-detailed 20 yc
 *   npm run view-jobs-detailed 20 a16z
 */

import { prisma } from './prisma'

async function viewJobsDetailed() {
  const limit = parseInt(process.argv[2] || '20', 10)
  const filter = (process.argv[3] || '').toLowerCase()

  console.log(`\n${'='.repeat(100)}`)
  console.log(`📋 DETAILED JOB VIEWER - Latest ${limit} Jobs`)
  console.log(`${'='.repeat(100)}`)

  // Build source filter
  let sourceWhere = undefined
  if (filter === 'yc') {
    sourceWhere = { sources: { some: { source: 'Y Combinator' } } }
  } else if (filter === 'a16z') {
    sourceWhere = { sources: { some: { source: 'a16z' } } }
  }

  const jobs = await prisma.trackerRole.findMany({
    where: sourceWhere,
    include: {
      sources: true,
    },
    orderBy: { last_seen_at: 'desc' },
    take: limit,
  })

  if (jobs.length === 0) {
    console.log('❌ No jobs found.')
    await prisma.$disconnect()
    return
  }

  jobs.forEach((job, idx) => {
    console.log(`\n[${idx + 1}/${jobs.length}] ${job.company_name}`)
    console.log('─'.repeat(100))
    console.log(`  Title:         ${job.role_title}`)
    console.log(`  Level:         ${job.role_level || '(missing)'}`)
    console.log(`  Location:      ${job.location || '(missing)'}`)
    console.log(`  Work Mode:     ${job.work_mode || '(missing)'}`)
    console.log(`  Salary:        ${job.compensation_text || '(missing)'}`)
    if (job.salary_min && job.salary_max) {
      console.log(`    → Min: ${job.salary_min}, Max: ${job.salary_max}, Currency: ${job.salary_currency}`)
    }
    console.log(`  Posted:        ${job.posting_date?.toLocaleDateString() || '(missing)'}`)
    console.log(`  Company Domain: ${job.company_domain || '(missing)'}`)
    console.log(`  Funding Stage: ${job.funding_stage || '(missing)'}`)
    console.log(`  Industry:      ${job.industry || '(missing)'}`)
    console.log(`  Description:   ${job.company_description?.substring(0, 60) || '(missing)'}`)
    console.log(`  Sources:       ${job.sources.length} found`)
    job.sources.forEach(src => {
      console.log(`    • ${src.source}`)
      console.log(`      URL: ${src.application_url}`)
      console.log(`      Last Seen: ${src.last_seen_at.toLocaleDateString()}`)
    })
  })

  console.log(`\n${'='.repeat(100)}`)
  console.log(`📊 STATISTICS`)
  console.log('='.repeat(100))

  const stats = await prisma.trackerRole.aggregate({
    _count: true,
  })

  console.log(`Total jobs in database: ${stats._count}`)

  // Check for missing fields
  const missingLevels = await prisma.trackerRole.count({
    where: { role_level: null },
  })
  const missingMode = await prisma.trackerRole.count({
    where: { work_mode: null },
  })
  const missingLocation = await prisma.trackerRole.count({
    where: { location: null },
  })
  const missingSalary = await prisma.trackerRole.count({
    where: { compensation_text: null },
  })

  console.log('\n⚠️  Missing Fields:')
  console.log(`  • role_level: ${missingLevels} (${(missingLevels / stats._count * 100).toFixed(1)}%)`)
  console.log(`  • work_mode: ${missingMode} (${(missingMode / stats._count * 100).toFixed(1)}%)`)
  console.log(`  • location: ${missingLocation} (${(missingLocation / stats._count * 100).toFixed(1)}%)`)
  console.log(`  • compensation_text: ${missingSalary} (${(missingSalary / stats._count * 100).toFixed(1)}%)`)

  // Check for data inconsistencies
  const workModes = await prisma.trackerRole.groupBy({
    by: ['work_mode'],
    _count: true,
  })

  console.log('\n🔍 Work Mode Values (check for inconsistencies):')
  workModes.forEach(wm => {
    console.log(`  • "${wm.work_mode}": ${wm._count}`)
  })

  const sources = await prisma.trackerRoleSource.groupBy({
    by: ['source'],
    _count: true,
  })

  console.log('\n🔍 Source Values (check for inconsistencies):')
  sources.forEach(src => {
    console.log(`  • "${src.source}": ${src._count}`)
  })

  await prisma.$disconnect()
}

viewJobsDetailed().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
