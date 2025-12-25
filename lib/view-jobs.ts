/**
 * View scraped jobs in terminal table format
 * Usage: npm run view-jobs [limit] [filter]
 * Examples:
 *   npm run view-jobs
 *   npm run view-jobs 50
 *   npm run view-jobs 20 yc
 *   npm run view-jobs 30 a16z
 */

import { prisma } from './prisma'

interface TableRow {
  [key: string]: string | number | null | undefined
}

function printTable(rows: TableRow[], columns: string[]) {
  if (rows.length === 0) {
    console.log('No jobs found.')
    return
  }

  // Calculate column widths
  const widths: { [key: string]: number } = {}
  columns.forEach(col => {
    widths[col] = Math.max(
      col.length,
      ...rows.map(row => String(row[col] || '').length)
    )
  })

  // Print header
  const headerRow = columns
    .map(col => col.padEnd(widths[col]))
    .join(' │ ')
  console.log(headerRow)
  console.log(
    columns
      .map(col => '─'.repeat(widths[col]))
      .join('─┼─')
  )

  // Print data rows
  rows.forEach(row => {
    const dataRow = columns
      .map(col => String(row[col] || 'N/A').padEnd(widths[col]))
      .join(' │ ')
    console.log(dataRow)
  })
}

async function viewJobs() {
  const limit = parseInt(process.argv[2] || '50', 10)
  const filter = (process.argv[3] || '').toLowerCase()

  console.log(`\n📊 Latest ${limit} Scraped Jobs`)
  console.log(`Filter: ${filter || 'All'}\n`)

  // Build query filter
  let sourceFilter = {}
  if (filter === 'yc') {
    sourceFilter = { sources: { some: { source: 'Y Combinator' } } }
  } else if (filter === 'a16z') {
    sourceFilter = { sources: { some: { source: 'a16z' } } }
  }

  // Fetch jobs
  const jobs = await prisma.trackerRole.findMany({
    where: sourceFilter,
    include: {
      sources: {
        select: {
          source: true,
          application_url: true,
        },
        take: 1, // Just get one source for display
      },
    },
    orderBy: { last_seen_at: 'desc' },
    take: limit,
  })

  if (jobs.length === 0) {
    console.log('No jobs found matching filter.')
    await prisma.$disconnect()
    return
  }

  // Format for table display
  const rows = jobs.map(job => ({
    company: job.company_name,
    role: job.role_title.substring(0, 35),
    level: job.role_level || '—',
    location: (job.location || '—').substring(0, 20),
    mode: job.work_mode || '—',
    salary: job.compensation_text ? job.compensation_text.substring(0, 20) : '—',
    source: job.sources[0]?.source || '—',
  }))

  printTable(rows, ['company', 'role', 'level', 'location', 'mode', 'salary', 'source'])

  // Print summary stats
  console.log(`\n${'─'.repeat(80)}`)
  console.log(`Total shown: ${rows.length}`)

  // Count by source
  const sources = await prisma.trackerRoleSource.groupBy({
    by: ['source'],
    _count: true,
  })

  console.log('\nJobs by source:')
  sources.forEach(s => {
    console.log(`  • ${s.source}: ${s._count}`)
  })

  // Count by level
  const levels = await prisma.trackerRole.groupBy({
    by: ['role_level'],
    _count: true,
  })

  console.log('\nJobs by level:')
  levels
    .filter(l => l.role_level)
    .forEach(l => {
      console.log(`  • ${l.role_level}: ${l._count}`)
    })

  // Count by work mode
  const modes = await prisma.trackerRole.groupBy({
    by: ['work_mode'],
    _count: true,
  })

  console.log('\nJobs by work mode:')
  modes
    .filter(m => m.work_mode)
    .forEach(m => {
      console.log(`  • ${m.work_mode}: ${m._count}`)
    })

  await prisma.$disconnect()
}

viewJobs().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
