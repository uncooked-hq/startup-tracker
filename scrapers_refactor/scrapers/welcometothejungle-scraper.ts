/**
 * Welcome to the Jungle Jobs Scraper
 *
 * Uses Algolia Search API directly for fast, reliable job extraction.
 * No Playwright needed - just API calls.
 *
 * Algolia Index: wttj_jobs_production
 */

import type { Scraper, TrackerRoleData, TrackerRoleSourceData } from '../types'
import { normalizeText, extractRoleLevel, isValidJob } from '../utils/helpers'

// Algolia configuration (from page source)
const ALGOLIA_APP_ID = 'CSEKHVMS53'
const ALGOLIA_API_KEY = '4bd8f6215d0cc52b26430765769e65a0'
// Index names to try (first working one is used)
const ALGOLIA_INDEXES = [
  'wttj_jobs_production_en', // This works for English jobs
  'wttj_jobs_production',
]

const WTTJ_BASE_URL = 'https://www.welcometothejungle.com'

interface AlgoliaJob {
  objectID: string
  name: string // Job title
  slug: string
  published_at: string
  office?: {
    name?: string
    city?: string
    country?: string
    country_code?: string
  }
  offices?: Array<{
    name?: string
    city?: string
    country?: string
    country_code?: string
  }>
  organization?: {
    name: string
    slug: string
    description?: string
    nb_employees?: string
    industry?: string
  }
  contract_type?: string // 'full_time', 'part_time', 'internship', etc.
  remote?: string // 'fulltime', 'partial', 'punctual', 'no'
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  salary_period?: string
  experience_level?: string // 'junior', 'mid', 'senior', 'executive'
  department?: string
  profession?: {
    name?: string
    category_name?: string
  }
  language?: string
  _highlightResult?: Record<string, unknown>
}

interface AlgoliaResponse {
  hits: AlgoliaJob[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
}

/**
 * Query Algolia for jobs
 */
async function searchAlgoliaJobs(
  query: string = '',
  page: number = 0,
  hitsPerPage: number = 100,
  filters?: string
): Promise<AlgoliaResponse> {
  // Try different Algolia endpoint formats and index names
  const appIdLower = ALGOLIA_APP_ID.toLowerCase()
  const baseUrls = [
    `https://${appIdLower}-dsn.algolia.net/1/indexes`,
    `https://${appIdLower}-1.algolianet.com/1/indexes`,
  ]

  // Build all combinations of base URL and index name
  const endpoints: string[] = []
  for (const baseUrl of baseUrls) {
    for (const index of ALGOLIA_INDEXES) {
      endpoints.push(`${baseUrl}/${index}/query`)
    }
  }


  const payload: Record<string, unknown> = {
    query,
    page,
    hitsPerPage,
    attributesToRetrieve: [
      'objectID', 'name', 'slug', 'published_at',
      'office', 'offices', 'organization',
      'contract_type', 'remote',
      'salary_min', 'salary_max', 'salary_currency', 'salary_period',
      'experience_level', 'department', 'profession', 'language'
    ],
  }

  if (filters) {
    payload.filters = filters
  }

  let lastError: Error | null = null

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'Referer': 'https://www.welcometothejungle.com/',
          'Origin': 'https://www.welcometothejungle.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        return await response.json()
      }

      lastError = new Error(`${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
    }
  }

  throw new Error(`All Algolia endpoints failed. Last error: ${lastError?.message}`)
}

/**
 * Map contract type to our role type
 */
function mapContractType(contractType?: string): string {
  switch (contractType?.toLowerCase()) {
    case 'full_time':
    case 'full-time':
      return 'Full-time'
    case 'part_time':
    case 'part-time':
      return 'Part-time'
    case 'internship':
      return 'Internship'
    case 'apprenticeship':
      return 'Apprenticeship'
    case 'freelance':
      return 'Freelance'
    case 'temporary':
      return 'Contract'
    default:
      return 'Full-time'
  }
}

/**
 * Map remote type to our work mode
 */
function mapRemoteType(remote?: string): 'Remote' | 'Hybrid' | 'Onsite' {
  switch (remote?.toLowerCase()) {
    case 'fulltime':
    case 'full':
      return 'Remote'
    case 'partial':
    case 'hybrid':
      return 'Hybrid'
    case 'punctual':
    case 'no':
    default:
      return 'Onsite'
  }
}

/**
 * Map experience level to our role level
 */
function mapExperienceLevel(level?: string): 'Entry' | 'Mid' | 'Senior' | null {
  switch (level?.toLowerCase()) {
    case 'junior':
    case 'entry':
    case '0-1':
    case '0_1':
      return 'Entry'
    case 'mid':
    case 'intermediate':
    case '1-3':
    case '1_3':
    case '3-5':
    case '3_5':
      return 'Mid'
    case 'senior':
    case 'lead':
    case 'executive':
    case '5+':
    case '5_plus':
      return 'Senior'
    default:
      return null
  }
}

/**
 * Build job URL
 */
function buildJobUrl(job: AlgoliaJob): string {
  const orgSlug = job.organization?.slug || 'company'
  return `${WTTJ_BASE_URL}/en/companies/${orgSlug}/jobs/${job.slug}`
}

/**
 * Parse a single job into our format
 */
function parseJob(job: AlgoliaJob): { role: TrackerRoleData; source: TrackerRoleSourceData } | null {
  try {
    const jobTitle = normalizeText(job.name)
    const companyName = normalizeText(job.organization?.name || 'Unknown')
    const applicationUrl = buildJobUrl(job)

    if (!isValidJob(jobTitle, companyName, applicationUrl)) {
      return null
    }

    // Extract location from office or offices array
    let location = 'Unknown'
    const office = job.office || job.offices?.[0]
    if (office) {
      const parts = [office.city, office.country].filter(Boolean)
      location = parts.join(', ') || 'Unknown'
    }

    // Extract salary info
    let compensationText: string | null = null
    if (job.salary_min || job.salary_max) {
      const currency = job.salary_currency || 'EUR'
      const period = job.salary_period === 'yearly' ? '/year' : ''

      if (job.salary_min && job.salary_max) {
        compensationText = `${currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}${period}`
      } else if (job.salary_min) {
        compensationText = `${currency} ${job.salary_min.toLocaleString()}+${period}`
      } else if (job.salary_max) {
        compensationText = `Up to ${currency} ${job.salary_max.toLocaleString()}${period}`
      }
    }

    // Parse posting date
    let postingDate = new Date()
    if (job.published_at) {
      postingDate = new Date(job.published_at)
    }

    // Determine role level
    let roleLevel = mapExperienceLevel(job.experience_level)
    if (!roleLevel) {
      roleLevel = extractRoleLevel(jobTitle)
    }

    const role: TrackerRoleData = {
      company_name: companyName,
      role_title: jobTitle,
      company_description: job.organization?.description ? normalizeText(job.organization.description) : null,
      company_domain: null,
      industry: job.organization?.industry || job.profession?.category_name || null,
      funding_stage: null,
      role_type: mapContractType(job.contract_type),
      role_level: roleLevel,
      work_mode: mapRemoteType(job.remote),
      location: location,
      compensation_text: compensationText,
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      salary_currency: job.salary_currency || null,
      offers_equity: null,
      role_description: null,
      posting_date: postingDate,
      closing_date: null,
    }

    const source: TrackerRoleSourceData = {
      source: 'Welcome to the Jungle',
      source_role_id: job.objectID,
      source_url: `${WTTJ_BASE_URL}/en/jobs`,
      application_url: applicationUrl,
      raw_payload: {
        department: job.department,
        profession: job.profession,
        contract_type: job.contract_type,
        remote: job.remote,
        experience_level: job.experience_level,
        nb_employees: job.organization?.nb_employees,
      }
    }

    return { role, source }
  } catch (error) {
    return null
  }
}

export const welcomeToTheJungleScraper: Scraper = {
  name: 'Welcome to the Jungle',
  url: `${WTTJ_BASE_URL}/en/jobs`,

  async parse(_html: string) {
    const results: Array<{ role: TrackerRoleData; source: TrackerRoleSourceData }> = []
    const seenIds = new Set<string>()

    try {
      // Fetch multiple pages to get more jobs
      const maxPages = 5
      const hitsPerPage = 100

      for (let page = 0; page < maxPages; page++) {
        console.log(`[${this.name}] Fetching page ${page + 1}/${maxPages}...`)

        const response = await searchAlgoliaJobs('', page, hitsPerPage)
        console.log(`[${this.name}]   Got ${response.hits.length} jobs (${response.nbHits} total available)`)

        if (response.hits.length === 0) {
          console.log(`[${this.name}]   No more jobs, stopping`)
          break
        }

        for (const job of response.hits) {
          if (seenIds.has(job.objectID)) continue
          seenIds.add(job.objectID)

          const parsed = parseJob(job)
          if (parsed) {
            results.push(parsed)
          }
        }

        // Stop if we've fetched all pages
        if (page >= response.nbPages - 1) {
          console.log(`[${this.name}]   Reached last page`)
          break
        }
      }

      console.log(`[${this.name}] Total unique jobs: ${results.length}`)
      return results
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return results
    }
  }
}

// Standalone test
if (require.main === module) {
  ;(async () => {
    console.log('Testing Welcome to the Jungle scraper (Algolia API)...\n')

    const result = await welcomeToTheJungleScraper.parse('')

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Total Roles: ${result.length}`)
    console.log('='.repeat(60))

    // Show first 10 jobs
    result.slice(0, 10).forEach((item, i) => {
      console.log(`\n[${i + 1}] ${item.role.company_name} - ${item.role.role_title}`)
      console.log(`    Location: ${item.role.location} | Mode: ${item.role.work_mode}`)
      console.log(`    Type: ${item.role.role_type} | Level: ${item.role.role_level}`)
      if (item.role.compensation_text) {
        console.log(`    Salary: ${item.role.compensation_text}`)
      }
      console.log(`    URL: ${item.source.application_url}`)
    })

    // Summary by work mode
    const byMode = result.reduce((acc, { role }) => {
      const mode = role.work_mode || 'Unknown'
      acc[mode] = (acc[mode] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`\n${'='.repeat(60)}`)
    console.log('By Work Mode:')
    Object.entries(byMode).forEach(([mode, count]) => {
      console.log(`  ${mode}: ${count}`)
    })
    console.log('='.repeat(60))
  })()
}
