/**
 * Seedcamp Talent Scraper
 *
 * Scrapes https://talent.seedcamp.com/jobs
 * Jobs are embedded in Next.js __NEXT_DATA__ script tag.
 * Powered by Getro job aggregation platform.
 *
 * Note: The Getro API requires authentication for pagination.
 * This scraper extracts ~20 jobs from the initial page load.
 * These are curated jobs from top Seedcamp portfolio companies
 * (UiPath, Wise, Revolut, etc.)
 */

import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

const SEEDCAMP_JOBS_URL = 'https://talent.seedcamp.com/jobs'

interface SeedcampJob {
  id: number
  title: string
  slug: string
  organization: {
    id: number
    name: string
    slug: string
    stage?: string // 'seed', 'series_a', 'series_b', 'ipo', 'other'
    logoUrl?: string
    headCount?: number
    industryTags?: string[]
  }
  locations: string[]
  locationDetails?: Array<{
    name: string
    areaType?: string // 'city', 'country', 'region'
    point?: string // "POINT (lng lat)"
  }>
  workMode?: string // 'on_site', 'remote', 'hybrid'
  url: string // External career page URL
  createdAt: number // Unix timestamp
  source?: string
  seniority?: string | null // 'entry', 'mid_senior', 'senior', 'executive'
  compensationAmountMinCents?: number | null
  compensationAmountMaxCents?: number | null
  compensationCurrency?: string | null
  skills?: string[]
  hasDescription?: boolean
  isDiscarded?: boolean
}

interface NextDataResponse {
  props: {
    pageProps: {
      initialState: {
        jobs: {
          found: SeedcampJob[]
          total: number
        }
      }
    }
  }
}

/**
 * Fetch jobs from the page HTML
 */
async function fetchSeedcampJobs(): Promise<SeedcampJob[]> {
  const response = await fetch(SEEDCAMP_JOBS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()

  // Extract __NEXT_DATA__ script content
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!nextDataMatch) {
    throw new Error('Could not find __NEXT_DATA__ in page')
  }

  const nextData: NextDataResponse = JSON.parse(nextDataMatch[1])
  const jobs = nextData.props?.pageProps?.initialState?.jobs?.found || []

  return jobs
}

/**
 * Map work mode
 */
function mapWorkMode(mode?: string): 'Remote' | 'Hybrid' | 'Onsite' {
  switch (mode?.toLowerCase()) {
    case 'remote':
      return 'Remote'
    case 'hybrid':
      return 'Hybrid'
    case 'on_site':
    case 'onsite':
    default:
      return 'Onsite'
  }
}

/**
 * Map funding stage
 */
function mapFundingStage(stage?: string): string | null {
  switch (stage?.toLowerCase()) {
    case 'seed':
      return 'Seed'
    case 'series_a':
      return 'Series A'
    case 'series_b':
      return 'Series B'
    case 'series_c':
      return 'Series C'
    case 'ipo':
      return 'IPO'
    default:
      return null
  }
}

/**
 * Map seniority to role level
 */
function mapSeniority(seniority?: string | null): 'Entry' | 'Mid' | 'Senior' | null {
  switch (seniority?.toLowerCase()) {
    case 'entry':
    case 'entry_level':
    case 'junior':
      return 'Entry'
    case 'mid':
    case 'mid_senior':
      return 'Mid'
    case 'senior':
    case 'executive':
    case 'director':
      return 'Senior'
    default:
      return null
  }
}

/**
 * Parse a single job
 */
function parseJob(job: SeedcampJob): { role: TrackerRoleData; source: TrackerRoleSourceData } | null {
  try {
    const jobTitle = normalizeText(job.title)
    const companyName = normalizeText(job.organization?.name || 'Unknown')
    const applicationUrl = job.url || `${SEEDCAMP_JOBS_URL}/${job.slug}`

    if (!isValidJob(jobTitle, companyName, applicationUrl)) {
      return null
    }

    // Build location string
    const location = job.locations?.join(', ') || 'Unknown'

    // Extract salary if present
    let salaryMin: number | null = null
    let salaryMax: number | null = null
    let salaryCurrency: string | null = null
    let compensationText: string | null = null

    if (job.compensationAmountMinCents || job.compensationAmountMaxCents) {
      salaryMin = job.compensationAmountMinCents ? Math.round(job.compensationAmountMinCents / 100) : null
      salaryMax = job.compensationAmountMaxCents ? Math.round(job.compensationAmountMaxCents / 100) : null
      salaryCurrency = job.compensationCurrency || 'USD'

      if (salaryMin && salaryMax) {
        compensationText = `${salaryCurrency} ${salaryMin.toLocaleString()} - ${salaryMax.toLocaleString()}`
      } else if (salaryMin) {
        compensationText = `${salaryCurrency} ${salaryMin.toLocaleString()}+`
      }
    }

    // Parse posting date
    const postingDate = job.createdAt ? new Date(job.createdAt * 1000) : new Date()

    // Determine role level
    let roleLevel = mapSeniority(job.seniority)
    if (!roleLevel) {
      roleLevel = extractRoleLevel(jobTitle)
    }

    // Extract industry
    const industry = job.organization?.industryTags?.[0] || null

    // Company size
    let companySizeMin: number | null = null
    let companySizeMax: number | null = null
    if (job.organization?.headCount) {
      companySizeMin = job.organization.headCount
      companySizeMax = job.organization.headCount
    }

    const role: TrackerRoleData = {
      company_name: companyName,
      role_title: jobTitle,
      company_description: null,
      company_domain: null,
      company_size_min: companySizeMin,
      company_size_max: companySizeMax,
      industry: industry,
      funding_stage: mapFundingStage(job.organization?.stage),
      role_type: 'Full-time',
      role_level: roleLevel,
      work_mode: mapWorkMode(job.workMode),
      location: location,
      compensation_text: compensationText,
      salary_min: salaryMin,
      salary_max: salaryMax,
      salary_currency: salaryCurrency,
      offers_equity: null,
      role_description: null,
      posting_date: postingDate,
      closing_date: null,
    }

    const source: TrackerRoleSourceData = {
      source: 'Seedcamp',
      source_role_id: String(job.id),
      source_url: SEEDCAMP_JOBS_URL,
      application_url: applicationUrl,
      raw_payload: {
        organization_slug: job.organization?.slug,
        organization_stage: job.organization?.stage,
        seniority: job.seniority,
        skills: job.skills,
        source: job.source,
      }
    }

    return { role, source }
  } catch (error) {
    return null
  }
}

export const seedcampScraper: Scraper = {
  name: 'Seedcamp',
  url: SEEDCAMP_JOBS_URL,

  async parse(_html: string) {
    try {
      console.log(`[${this.name}] Fetching jobs from ${SEEDCAMP_JOBS_URL}...`)

      const jobs = await fetchSeedcampJobs()
      console.log(`[${this.name}] Found ${jobs.length} jobs in page data`)

      const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []

      for (const job of jobs) {
        // Skip discarded jobs
        if (job.isDiscarded) continue

        const parsed = parseJob(job)
        if (parsed) {
          results.push(parsed)
        }
      }

      console.log(`[${this.name}] Total valid jobs: ${results.length}`)
      return results
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return []
    }
  }
}

// Standalone test
if (require.main === module) {
  ;(async () => {
    console.log('Testing Seedcamp scraper...\n')

    const result = await seedcampScraper.parse('')

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.length}`)
    console.log('='.repeat(60))

    // Show first 10 jobs
    result.slice(0, 10).forEach((item, i) => {
      console.log(`\n[${i + 1}] ${item.role.company_name} - ${item.role.role_title}`)
      console.log(`    Location: ${item.role.location} | Mode: ${item.role.work_mode}`)
      console.log(`    Stage: ${item.role.funding_stage || 'N/A'} | Level: ${item.role.role_level}`)
      if (item.role.compensation_text) {
        console.log(`    Salary: ${item.role.compensation_text}`)
      }
      console.log(`    URL: ${item.source.application_url}`)
    })

    // Summary by funding stage
    const byStage = result.reduce((acc, { role }) => {
      const stage = role.funding_stage || 'Unknown'
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Summary by work mode
    const byMode = result.reduce((acc, { role }) => {
      const mode = role.work_mode || 'Unknown'
      acc[mode] = (acc[mode] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`\n${'='.repeat(60)}`)
    console.log('By Funding Stage:')
    Object.entries(byStage).sort((a, b) => b[1] - a[1]).forEach(([stage, count]) => {
      console.log(`  ${stage}: ${count}`)
    })
    console.log('\nBy Work Mode:')
    Object.entries(byMode).forEach(([mode, count]) => {
      console.log(`  ${mode}: ${count}`)
    })
    console.log('='.repeat(60))
  })()
}
