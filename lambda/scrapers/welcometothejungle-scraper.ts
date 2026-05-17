/**
 * Welcome to the Jungle Jobs Scraper
 *
 * Uses Algolia Search API directly — no browser needed.
 * Algolia Index: wttj_jobs_production_en
 */

import { BaseScraper } from './base-scraper'
import { classifyIndustry } from './classify'
import type { ScraperResult, JobData } from './types'

const ALGOLIA_APP_ID = 'CSEKHVMS53'
const ALGOLIA_API_KEY = '4bd8f6215d0cc52b26430765769e65a0'
const ALGOLIA_INDEXES = ['wttj_jobs_production_en', 'wttj_jobs_production']
const WTTJ_BASE_URL = 'https://www.welcometothejungle.com'

interface AlgoliaJob {
  objectID: string
  name: string
  slug: string
  published_at: string
  office?: { name?: string; city?: string; country?: string; country_code?: string }
  offices?: Array<{ name?: string; city?: string; country?: string; country_code?: string }>
  organization?: {
    name: string
    slug: string
    description?: string
    nb_employees?: string
    industry?: string
  }
  contract_type?: string
  remote?: string
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  salary_period?: string
  experience_level?: string
  department?: string
  profession?: { name?: string; category_name?: string }
}

interface AlgoliaResponse {
  hits: AlgoliaJob[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
}

// Allowed European countries (matched against office.country text field)
const ALLOWED_COUNTRIES = new Set([
  'united kingdom', 'germany', 'netherlands', 'ireland', 'sweden',
  'spain', 'portugal', 'denmark', 'norway', 'finland', 'austria',
  'belgium', 'switzerland', 'poland', 'italy', 'czech republic',
  'czechia', 'romania', 'estonia', 'lithuania', 'latvia', 'france',
  // Common English variations
  'uk', 'england', 'scotland', 'wales',
])

async function searchAlgoliaJobs(
  query = '',
  page = 0,
  hitsPerPage = 100,
): Promise<AlgoliaResponse> {
  const appIdLower = ALGOLIA_APP_ID.toLowerCase()
  const baseUrls = [
    `https://${appIdLower}-dsn.algolia.net/1/indexes`,
    `https://${appIdLower}-1.algolianet.com/1/indexes`,
  ]

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
      'experience_level', 'department', 'profession',
    ],
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
          Referer: 'https://www.welcometothejungle.com/',
          Origin: 'https://www.welcometothejungle.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        return (await response.json()) as AlgoliaResponse
      }

      lastError = new Error(`${response.status} ${response.statusText}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
    }
  }

  throw new Error(`All Algolia endpoints failed. Last error: ${lastError?.message}`)
}

function mapContractType(ct?: string): string {
  switch (ct?.toLowerCase()) {
    case 'full_time': case 'full-time': return 'Full-time'
    case 'part_time': case 'part-time': return 'Part-time'
    case 'internship': return 'Internship'
    case 'freelance': return 'Freelance'
    case 'temporary': return 'Contract'
    default: return 'Full-time'
  }
}

function mapRemoteType(remote?: string): string {
  switch (remote?.toLowerCase()) {
    case 'fulltime': case 'full': return 'Remote'
    case 'partial': case 'hybrid': return 'Hybrid'
    default: return 'Onsite'
  }
}

function mapExperienceLevel(level?: string): string {
  switch (level?.toLowerCase()) {
    case 'junior': case 'entry': case '0-1': case '0_1': return 'Entry'
    case 'senior': case 'lead': case 'executive': case '5+': case '5_plus': return 'Senior'
    default: return 'Mid'
  }
}

export class WelcomeToTheJungleScraper extends BaseScraper {
  name = 'Welcome to the Jungle'
  sourceUrl = `${WTTJ_BASE_URL}/en/jobs`

  // No browser needed
  async scrape(): Promise<ScraperResult> {
    return this.scrapeInternal()
  }

  async scrapeInternal(): Promise<ScraperResult> {
    try {
      const jobs: JobData[] = []
      const seenIds = new Set<string>()
      const maxPages = 15
      const hitsPerPage = 100
      const maxFranceJobs = 50  // Cap France jobs to avoid drowning out other countries
      let franceCount = 0

      for (let page = 0; page < maxPages; page++) {
        console.log(`[${this.name}] Fetching page ${page + 1}/${maxPages}...`)

        const response = await searchAlgoliaJobs('', page, hitsPerPage)
        console.log(`[${this.name}]   Got ${response.hits.length} jobs (${response.nbHits} total)`)

        if (response.hits.length === 0) break

        for (const job of response.hits) {
          if (seenIds.has(job.objectID)) continue
          seenIds.add(job.objectID)

          const title = this.normalizeText(job.name)
          const company = this.normalizeText(job.organization?.name || '')
          const orgSlug = job.organization?.slug || 'company'
          const applicationUrl = `${WTTJ_BASE_URL}/en/companies/${orgSlug}/jobs/${job.slug}`

          if (!BaseScraper.isValidJob(title, company, applicationUrl)) continue

          // Location
          const office = job.office || job.offices?.[0]
          const locationParts = [office?.city, office?.country].filter(Boolean)
          const location = locationParts.join(', ') || 'Not specified'

          // Filter Israel
          const israelPattern = /\bisrael\b|tel\s*aviv|jerusalem|haifa/i
          if (israelPattern.test(location)) continue

          // Post-filter: only keep European jobs
          const country = (office?.country || '').toLowerCase().trim()
          if (country && !ALLOWED_COUNTRIES.has(country)) continue

          // Cap France jobs to avoid drowning out other countries
          if (country === 'france') {
            franceCount++
            if (franceCount > maxFranceJobs) continue
          }

          // Compensation
          let compensation = 'Not specified'
          if (job.salary_min || job.salary_max) {
            const currency = job.salary_currency || 'EUR'
            if (job.salary_min && job.salary_max) {
              compensation = `${currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}/year`
            } else if (job.salary_min) {
              compensation = `${currency} ${job.salary_min.toLocaleString()}+/year`
            }
          }

          const { industry } = classifyIndustry(company, title, job.organization?.description || '')

          const postingDate = job.published_at ? new Date(job.published_at) : new Date()

          jobs.push({
            company_name: company,
            industry,
            location,
            funding_stage: 'Welcome to the Jungle',
            role_title: title,
            role_type: mapContractType(job.contract_type),
            role_level: mapExperienceLevel(job.experience_level),
            work_mode: mapRemoteType(job.remote),
            compensation,
            equity: null,
            posting_date: postingDate,
            closing_date: null,
            company_description: job.organization?.description || '',
            application_link: applicationUrl,
            source_website: this.sourceUrl,
            is_active: true,
          })
        }

        if (page >= response.nbPages - 1) break
      }

      console.log(`[${this.name}] Returning ${jobs.length} valid jobs`)

      return { success: true, jobs, source: this.name }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.name}] Error: ${msg}`)
      return { success: false, jobs: [], error: msg, source: this.name }
    }
  }
}
